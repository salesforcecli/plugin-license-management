/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { readFile } from 'node:fs/promises';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-license-management', 'license.provision');

type ProvisionLicenseSpec = {
  namespace?: string;
  license?: string;
  quantity?: number;
};

type ApiLicenseSpec = {
  namespacePrefix?: string;
  permissionSetLicense?: string;
  quantity?: number;
};

type DefinitionFile = {
  licenses: ProvisionLicenseSpec[];
};

type ProvisionPslRequest = {
  licenses: ApiLicenseSpec[];
};

type ProvisionPslResponse = {
  status: string;
  licensesProvisioned?: number;
  message?: string;
  traceId?: string;
};

export type LicenseProvisionResult = {
  status: string;
  traceId?: string;
};

function getLicenseDefinitionName(spec: ProvisionLicenseSpec): string {
  const psl = spec.license ?? '';
  return spec.namespace ? `${spec.namespace}__${psl}` : psl;
}

function toApiSpec(spec: ProvisionLicenseSpec): ApiLicenseSpec {
  return {
    namespacePrefix: spec.namespace,
    permissionSetLicense: spec.license,
    quantity: spec.quantity,
  };
}

export default class LicenseProvision extends SfCommand<LicenseProvisionResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    // General question: If a definition-file is not passed, then are namespace, license, and quantity ALL required?
    // Just confirming because you have a mix of `dependsOn` and `relationships: [{ type: 'all' ...`
    namespace: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.namespace.summary'),
      dependsOn: ['license'],
      exclusive: ['definition-file'],
    }),
    license: Flags.string({
      char: 'l',
      summary: messages.getMessage('flags.license.summary'),
      exclusive: ['definition-file'],
      relationships: [{ type: 'all', flags: ['namespace', 'quantity'] }],
    }),
    quantity: Flags.integer({
      char: 'q',
      summary: messages.getMessage('flags.quantity.summary'),
      // TODO: Should min be 1? Provisioning 0 licenses is a no-op.
      min: 0,
      // You could also add a default so you didnt have to deal with `undefined`
      max: Number.MAX_SAFE_INTEGER,
      dependsOn: ['license'],
      exclusive: ['definition-file'],
    }),
    // TODO: This should use `Flags.file({ exists: true })` instead of `Flags.string()`.
    //       Otherwise your readFile will throw a raw ENOENT error for missing files.
    'definition-file': Flags.string({
      char: 'f',
      summary: messages.getMessage('flags.definition-file.summary'),
      exclusive: ['license', 'namespace', 'quantity'],
    }),
  };

  // Protected to allow stubbing in tests
  protected static async loadSpecsFromFile(filePath: string): Promise<ProvisionLicenseSpec[]> {
    const fileContent = await readFile(filePath, 'utf-8');
    // TODO: Wrap JSON.parse in a try/catch so malformed JSON gives a user-friendly error
    //       instead of a raw SyntaxError.
    const definition = JSON.parse(fileContent) as DefinitionFile;

    if (!Array.isArray(definition.licenses) || definition.licenses.length === 0) {
      throw messages.createError('error.emptyDefinitionFile');
    }

    const allowedFields: ReadonlySet<string> = new Set(['namespace', 'license', 'quantity']);
    const unknownFields = [
      ...new Set(definition.licenses.flatMap((entry) => Object.keys(entry).filter((key) => !allowedFields.has(key)))),
    ];
    if (unknownFields.length > 0) {
      throw messages.createError('error.unsupportedDefinitionFileFields', [unknownFields.join(', ')]);
    }

    const requiredFields = ['namespace', 'license', 'quantity'] as const;
    const missingFields = definition.licenses.flatMap((entry, index) =>
      requiredFields
        .filter((field) => entry[field] === undefined || entry[field] === null)
        .map((field) => `licenses[${index}].${field}`)
    );
    if (missingFields.length > 0) {
      throw messages.createError('error.missingRequiredDefinitionFileFields', [missingFields.join(', ')]);
    }

    return definition.licenses;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static buildSpecsFromFlags(flags: Record<string, any>): ProvisionLicenseSpec[] {
    if (!flags['license']) {
      throw messages.createError('error.missingLicenseFlag');
    }

    return [
      {
        namespace: flags['namespace'] as string | undefined,
        license: flags['license'] as string,
        quantity: flags['quantity'] as number | undefined,
      },
    ];
  }

  public async run(): Promise<LicenseProvisionResult> {
    const { flags } = await this.parse(LicenseProvision);

    const connection = flags['target-org'].getConnection(flags['api-version']);

    const licenseSpecs = flags['definition-file']
      ? await LicenseProvision.loadSpecsFromFile(flags['definition-file'])
      : LicenseProvision.buildSpecsFromFlags(flags);

    const endpoint = `/services/data/v${connection.getApiVersion()}/partnerdevelopment/permissionsetlicenses`;
    const requestBody: ProvisionPslRequest = { licenses: licenseSpecs.map(toApiSpec) };

    let response: ProvisionPslResponse;
    try {
      response = await connection.request<ProvisionPslResponse>({
        method: 'POST',
        url: endpoint,
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: unknown) {
      throw SfError.wrap(error instanceof Error ? error : new Error(String(error)));
    }

    if (response.status !== 'SUCCESS') {
      throw SfError.create({
        message: messages.getMessage('error.provisionFailed', [response.message ?? 'Unknown error']),
        name: 'PROVISION_FAILED',
        data: { traceId: response.traceId },
      });
    }

    this.display(licenseSpecs, response);

    return { status: 'success', traceId: response.traceId };
  }

  private display(licenseSpecs: ProvisionLicenseSpec[], response: ProvisionPslResponse): void {
    this.table({
      data: licenseSpecs.map((spec) => ({
        [messages.getMessage('success.column.licenseDefinition')]: getLicenseDefinitionName(spec),
        [messages.getMessage('success.column.provisionedQuantity')]: String(spec.quantity ?? 0),
      })),
      title: messages.getMessage('success'),
    });
    if (response.traceId) {
      this.log(messages.getMessage('success.traceId', [response.traceId]));
    }
  }
}
