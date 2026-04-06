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

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type ProvisionLicenseSpec = {
  namespacePrefix?: string;
  permissionSetLicense?: string;
  quantity?: number;
  startDate?: string;
  endDate?: string;
};

type ProvisionPslRequest = {
  licenses: ProvisionLicenseSpec[];
};

type ProvisionErrorMessage = {
  errorCode: string;
  message: string;
};

type ProvisionPslResponse = {
  status: string;
  licensesProvisioned?: number;
  message?: string;
  messages?: ProvisionErrorMessage[];
};

export type LicenseProvisionResult = {
  status: string;
  messages?: ProvisionErrorMessage[];
};

function getLicenseDefinitionName(spec: ProvisionLicenseSpec): string {
  const psl = spec.permissionSetLicense ?? '';
  return spec.namespacePrefix ? `${spec.namespacePrefix}__${psl}` : psl;
}

function validateDate(dateStr: string, flagName: string): void {
  if (!DATE_REGEX.test(dateStr)) {
    throw messages.createError('error.invalidDateFormat', [dateStr, flagName]);
  }
}

export default class LicenseProvision extends SfCommand<LicenseProvisionResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    namespace: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.namespace.summary'),
    }),
    license: Flags.string({
      char: 'l',
      summary: messages.getMessage('flags.license.summary'),
    }),
    quantity: Flags.integer({
      char: 'q',
      summary: messages.getMessage('flags.quantity.summary'),
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
    }),
    'start-date': Flags.string({
      char: 's',
      summary: messages.getMessage('flags.start-date.summary'),
    }),
    'end-date': Flags.string({
      char: 'e',
      summary: messages.getMessage('flags.end-date.summary'),
    }),
    'definition-file': Flags.string({
      char: 'f',
      summary: messages.getMessage('flags.definition-file.summary'),
    }),
  };

  // Protected to allow stubbing in tests
  protected static async loadSpecsFromFile(
    filePath: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    flags: Record<string, any>
  ): Promise<ProvisionLicenseSpec[]> {
    if (
      flags['license'] ||
      flags['namespace'] ||
      flags['quantity'] !== undefined ||
      flags['start-date'] ||
      flags['end-date']
    ) {
      throw messages.createError('error.mutuallyExclusiveFlags');
    }

    const fileContent = await readFile(filePath, 'utf-8');
    const definition = JSON.parse(fileContent) as ProvisionPslRequest;

    if (!Array.isArray(definition.licenses) || definition.licenses.length === 0) {
      throw messages.createError('error.emptyDefinitionFile');
    }

    return definition.licenses;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static buildSpecsFromFlags(flags: Record<string, any>): ProvisionLicenseSpec[] {
    if (!flags['license']) {
      throw messages.createError('error.missingLicenseFlag');
    }

    const startDate = (flags['start-date'] as string | undefined) ?? new Date().toISOString().slice(0, 10);

    return [
      {
        namespacePrefix: flags['namespace'] as string | undefined,
        permissionSetLicense: flags['license'] as string,
        quantity: flags['quantity'] as number | undefined,
        startDate,
        endDate: flags['end-date'] as string | undefined,
      },
    ];
  }

  public async run(): Promise<LicenseProvisionResult> {
    const { flags } = await this.parse(LicenseProvision);

    const connection = flags['target-org'].getConnection(flags['api-version']);

    const licenseSpecs = flags['definition-file']
      ? await LicenseProvision.loadSpecsFromFile(flags['definition-file'], flags)
      : LicenseProvision.buildSpecsFromFlags(flags);

    for (const spec of licenseSpecs) {
      if (spec.startDate) validateDate(spec.startDate, 'start-date');
      if (spec.endDate) validateDate(spec.endDate, 'end-date');
    }

    const endpoint = `/services/data/v${connection.getApiVersion()}/partnerdevelopment/permissionsetlicenses`;
    const requestBody: ProvisionPslRequest = { licenses: licenseSpecs };

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
      const errorMessages: ProvisionErrorMessage[] =
        response.messages ?? (response.message ? [{ errorCode: 'PROVISION_ERROR', message: response.message }] : []);

      const errorDetail = errorMessages.map((m) => m.message).join('  ');
      throw SfError.create({
        message: messages.getMessage('error.provisionFailed', [errorDetail]),
        name: 'PROVISION_FAILED',
        data: { status: 'error', messages: errorMessages },
      });
    }

    this.log(messages.getMessage('success'));
    for (const spec of licenseSpecs) {
      this.log(messages.getMessage('success.provisioned', [spec.quantity ?? 0, getLicenseDefinitionName(spec)]));
    }

    return { status: 'success' };
  }
}
