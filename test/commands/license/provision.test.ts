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

import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { Connection, Org } from '@salesforce/core';
import LicenseProvision from '../../../src/commands/license/provision.js';

const SUCCESS_RESPONSE = { status: 'SUCCESS', licensesProvisioned: 5, message: 'OK', traceId: 'tm_test123' };

describe('license provision', () => {
  const $$ = new TestContext();
  let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;
  let testOrg: MockTestOrgData;
  let requestStub: sinon.SinonStub;

  function buildMockConnection(response: unknown = SUCCESS_RESPONSE): sinon.SinonStub {
    const stub = $$.SANDBOX.stub().resolves(response);
    $$.SANDBOX.stub(Org.prototype, 'getConnection').returns({
      getApiVersion: () => '63.0',
      request: stub,
      // Required by Org.init() → Org.getField(ORG_ID) → getConnection().getAuthInfoFields()
      getAuthInfoFields: () => ({ orgId: testOrg.orgId, username: testOrg.username }),
    } as unknown as Connection);
    return stub;
  }

  beforeEach(async () => {
    sfCommandStubs = stubSfCommandUx($$.SANDBOX);
    testOrg = new MockTestOrgData();
    await $$.stubAuths(testOrg);
    requestStub = buildMockConnection();
  });

  afterEach(() => {
    $$.restore();
  });

  // ─── Success: CLI flags ──────────────────────────────────────────────────────

  it('provisions a single PSL using CLI flags and logs success', async () => {
    await LicenseProvision.run([
      '--target-org',
      testOrg.username,
      '--license',
      'newLicense',
      '--namespace',
      'demo',
      '--quantity',
      '5',
      '--start-date',
      '2026-03-30',
      '--end-date',
      '2027-03-30',
    ]);

    const tableCall = sfCommandStubs.table.firstCall.args[0] as { data: Array<Record<string, string>>; title: string };
    expect(tableCall.title).to.equal('Success:');
    expect(tableCall.data).to.deep.include({ 'License Definition': 'demo__newLicense', 'Provisioned Quantity': '5' });
    expect(
      sfCommandStubs.log
        .getCalls()
        .flatMap((c) => c.args)
        .join('\n')
    ).to.include('Trace ID: tm_test123');
  });

  it('provisions a PSL without a namespace', async () => {
    await LicenseProvision.run(['--target-org', testOrg.username, '--license', 'myLicense', '--quantity', '3']);

    const tableCall = sfCommandStubs.table.firstCall.args[0] as { data: Array<Record<string, string>> };
    expect(tableCall.data).to.deep.include({ 'License Definition': 'myLicense', 'Provisioned Quantity': '3' });
  });

  it('sends the correct POST request payload', async () => {
    await LicenseProvision.run([
      '--target-org',
      testOrg.username,
      '--license',
      'newLicense',
      '--namespace',
      'demo',
      '--quantity',
      '5',
      '--start-date',
      '2026-03-30',
      '--end-date',
      '2027-03-30',
    ]);

    expect(requestStub.calledOnce).to.be.true;
    const callArgs = requestStub.firstCall.args[0] as { method: string; body: string; url: string };
    expect(callArgs.method).to.equal('POST');
    expect(callArgs.url).to.include('/partnerdevelopment/permissionsetlicenses');

    const body = JSON.parse(callArgs.body) as { licenses: unknown[] };
    expect(body.licenses).to.have.length(1);
    expect(body.licenses[0]).to.deep.include({
      namespacePrefix: 'demo',
      permissionSetLicense: 'newLicense',
      quantity: 5,
      startDate: '2026-03-30',
      endDate: '2027-03-30',
    });
  });

  it('defaults start-date to today when not provided', async () => {
    const today = new Date().toISOString().slice(0, 10);

    await LicenseProvision.run(['--target-org', testOrg.username, '--license', 'myLicense']);

    const callArgs = requestStub.firstCall.args[0] as { body: string };
    const body = JSON.parse(callArgs.body) as { licenses: Array<{ startDate: string }> };
    expect(body.licenses[0].startDate).to.equal(today);
  });

  it('returns status:success result with traceId', async () => {
    const result = await LicenseProvision.run(['--target-org', testOrg.username, '--license', 'myLicense']);
    expect(result).to.deep.equal({ status: 'success', traceId: 'tm_test123' });
  });

  // ─── Success: definition file ────────────────────────────────────────────────

  describe('with a definition file', () => {
    let tmpFilePath: string;

    beforeEach(() => {
      tmpFilePath = join(tmpdir(), `provision-test-${Date.now()}.json`);
    });

    afterEach(async () => {
      await unlink(tmpFilePath).catch(() => {});
    });

    it('provisions multiple PSLs from a definition file and logs each', async () => {
      await writeFile(
        tmpFilePath,
        JSON.stringify({
          licenses: [
            { namespacePrefix: 'demo', permissionSetLicense: 'newLicense', quantity: 5 },
            { namespacePrefix: 'demo', permissionSetLicense: 'premiumLicense', quantity: 8 },
          ],
        })
      );

      await LicenseProvision.run(['--target-org', testOrg.username, '--definition-file', tmpFilePath]);

      const tableCall = sfCommandStubs.table.firstCall.args[0] as {
        data: Array<Record<string, string>>;
        title: string;
      };
      expect(tableCall.title).to.equal('Success:');
      expect(tableCall.data).to.deep.include({ 'License Definition': 'demo__newLicense', 'Provisioned Quantity': '5' });
      expect(tableCall.data).to.deep.include({
        'License Definition': 'demo__premiumLicense',
        'Provisioned Quantity': '8',
      });
      expect(
        sfCommandStubs.log
          .getCalls()
          .flatMap((c) => c.args)
          .join('\n')
      ).to.include('Trace ID: tm_test123');
    });

    it('sends all PSLs from the definition file in a single request', async () => {
      await writeFile(
        tmpFilePath,
        JSON.stringify({
          licenses: [
            { namespacePrefix: 'ns1', permissionSetLicense: 'licA', quantity: 10 },
            { namespacePrefix: 'ns2', permissionSetLicense: 'licB', quantity: 20 },
          ],
        })
      );

      await LicenseProvision.run(['--target-org', testOrg.username, '--definition-file', tmpFilePath]);

      expect(requestStub.calledOnce).to.be.true;
      const callArgs = requestStub.firstCall.args[0] as { body: string };
      const body = JSON.parse(callArgs.body) as { licenses: unknown[] };
      expect(body.licenses).to.have.length(2);
    });
  });

  // ─── Validation errors ───────────────────────────────────────────────────────

  it('throws when neither --license nor --definition-file is provided', async () => {
    try {
      await LicenseProvision.run(['--target-org', testOrg.username, '--namespace', 'demo']);
      expect.fail('Expected an error to be thrown');
    } catch (error: unknown) {
      expect((error as Error).message).to.include('--license');
    }
  });

  it('throws when --definition-file is combined with --license', async () => {
    const tmpFilePath = join(tmpdir(), `provision-excl-${Date.now()}.json`);
    await writeFile(tmpFilePath, JSON.stringify({ licenses: [{ permissionSetLicense: 'lic', quantity: 1 }] }));
    try {
      await LicenseProvision.run([
        '--target-org',
        testOrg.username,
        '--definition-file',
        tmpFilePath,
        '--license',
        'lic',
      ]);
      expect.fail('Expected an error to be thrown');
    } catch (error: unknown) {
      expect((error as Error).message).to.include('--definition-file');
    } finally {
      await unlink(tmpFilePath).catch(() => {});
    }
  });

  it('throws when --definition-file is combined with --quantity', async () => {
    const tmpFilePath = join(tmpdir(), `provision-excl-qty-${Date.now()}.json`);
    await writeFile(tmpFilePath, JSON.stringify({ licenses: [{ permissionSetLicense: 'lic', quantity: 1 }] }));
    try {
      await LicenseProvision.run([
        '--target-org',
        testOrg.username,
        '--definition-file',
        tmpFilePath,
        '--quantity',
        '5',
      ]);
      expect.fail('Expected an error to be thrown');
    } catch (error: unknown) {
      expect((error as Error).message).to.include('--definition-file');
    } finally {
      await unlink(tmpFilePath).catch(() => {});
    }
  });

  it('throws when definition file contains no license entries', async () => {
    const tmpFilePath = join(tmpdir(), `provision-empty-${Date.now()}.json`);
    await writeFile(tmpFilePath, JSON.stringify({ licenses: [] }));
    try {
      await LicenseProvision.run(['--target-org', testOrg.username, '--definition-file', tmpFilePath]);
      expect.fail('Expected an error to be thrown');
    } catch (error: unknown) {
      expect((error as Error).message).to.include('at least one');
    } finally {
      await unlink(tmpFilePath).catch(() => {});
    }
  });

  // ─── API error responses ─────────────────────────────────────────────────────

  it('wraps a HTTP 400 provisioning error as SfError', async () => {
    requestStub.rejects(
      Object.assign(new Error("Invalid endDate format for permissionSetLicense 'premium'"), {
        name: 'INVALID_END_DATE',
      })
    );

    try {
      await LicenseProvision.run(['--target-org', testOrg.username, '--license', 'premium']);
      expect.fail('Expected an error to be thrown');
    } catch (error: unknown) {
      expect((error as Error).message).to.include('Invalid endDate format');
    }
  });

  it('throws with a generic message when non-SUCCESS response has no message', async () => {
    requestStub.resolves({ status: 'ERROR' });

    try {
      await LicenseProvision.run(['--target-org', testOrg.username, '--license', 'anyLicense']);
      expect.fail('Expected an error to be thrown');
    } catch (error: unknown) {
      expect((error as Error).message).to.include('Unknown error');
    }
  });

  it('falls back gracefully when non-200 response has no structured error body', async () => {
    requestStub.resolves({ status: 'ERROR', message: 'An unexpected error occurred' });

    try {
      await LicenseProvision.run(['--target-org', testOrg.username, '--license', 'anyLicense']);
      expect.fail('Expected an error to be thrown');
    } catch (error: unknown) {
      expect((error as Error).message).to.include('An unexpected error occurred');
    }
  });

  it('wraps a network-level error as SfError', async () => {
    requestStub.rejects(new Error('ECONNREFUSED'));

    try {
      await LicenseProvision.run(['--target-org', testOrg.username, '--license', 'anyLicense']);
      expect.fail('Expected an error to be thrown');
    } catch (error: unknown) {
      expect((error as Error).message).to.include('ECONNREFUSED');
    }
  });
});
