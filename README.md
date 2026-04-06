**NOTE: This template for sf plugins is not yet official. Please consult with the Platform CLI team before using this template.**

# plugin-license-management

[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-license-management.svg?label=@salesforce/plugin-license-management)](https://www.npmjs.com/package/@salesforce/plugin-license-management) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-license-management.svg)](https://npmjs.org/package/@salesforce/plugin-license-management) [![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/license/apache-2-0)

## Using the template

This repository provides a template for creating a plugin for the Salesforce CLI. To convert this template to a working plugin:

1. Please get in touch with the Platform CLI team. We want to help you develop your plugin.
2. Generate your plugin:

   ```
   sf plugins install dev
   sf dev generate plugin

   git init -b main
   git add . && git commit -m "chore: initial commit"
   ```

3. Create your plugin's repo in the salesforcecli github org
4. When you're ready, replace the contents of this README with the information you want.

## Learn about `sf` plugins

Salesforce CLI plugins are based on the [oclif plugin framework](https://oclif.io/docs/introduction). Read the [plugin developer guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_architecture_sf_cli.htm) to learn about Salesforce CLI plugin development.

This repository contains a lot of additional scripts and tools to help with general Salesforce node development and enforce coding standards. You should familiarize yourself with some of the [node developer packages](#tooling) used by Salesforce. There is also a default circleci config using the [release management orb](https://github.com/forcedotcom/npm-release-management-orb) standards.

Additionally, there are some additional tests that the Salesforce CLI will enforce if this plugin is ever bundled with the CLI. These test are included by default under the `posttest` script and it is required to keep these tests active in your plugin if you plan to have it bundled.

### Tooling

- [@salesforce/core](https://github.com/forcedotcom/sfdx-core)
- [@salesforce/kit](https://github.com/forcedotcom/kit)
- [@salesforce/sf-plugins-core](https://github.com/salesforcecli/sf-plugins-core)
- [@salesforce/ts-types](https://github.com/forcedotcom/ts-types)
- [@salesforce/ts-sinon](https://github.com/forcedotcom/ts-sinon)
- [@salesforce/dev-config](https://github.com/forcedotcom/dev-config)
- [@salesforce/dev-scripts](https://github.com/forcedotcom/dev-scripts)

# Everything past here is only a suggestion as to what should be in your specific plugin's description

This plugin is bundled with the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli). For more information on the CLI, read the [getting started guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm).

We always recommend using the latest version of these commands bundled with the CLI, however, you can install a specific version or tag if needed.

## Install

```bash
sf plugins install @salesforce/plugin-license-management@x.y.z
```

## Issues

Please report any issues at https://github.com/forcedotcom/cli/issues

## Contributing

1. Please read our [Code of Conduct](CODE_OF_CONDUCT.md)
2. Create a new issue before starting your project so that we can keep track of
   what you are trying to add/fix. That way, we can also offer suggestions or
   let you know if there is already an effort in progress.
3. Fork this repository.
4. [Build the plugin locally](#build)
5. Create a _topic_ branch in your fork. Note, this step is recommended but technically not required if contributing using a fork.
6. Edit the code in your fork.
7. Write appropriate tests for your changes. Try to achieve at least 95% code coverage on any new code. No pull request will be accepted without unit tests.
8. Sign CLA (see [CLA](#cla) below).
9. Send us a pull request when you are done. We'll review your code, suggest any needed changes, and merge it in.

### CLA

External contributors will be required to sign a Contributor's License
Agreement. You can do so by going to https://cla.salesforce.com/sign-cla.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/plugin-license-management

# Install the dependencies and compile
yarn && yarn build
```

To use your plugin, run using the local `./bin/dev` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev license provision
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sf cli
sf plugins link .
# To verify
sf plugins
```

## Commands

<!-- commands -->

- [`sf license provision`](#sf-license-provision)

## `sf license provision`

Provision Permission Set Licenses (PSL) into a target org.

```
USAGE
  $ sf license provision -o <value> [-n <value>] [-l <value>] [-q <value>] [-s <value>] [-e <value>] [-f <value>] [--api-version <value>] [--json] [--flags-dir <value>]

FLAGS
  -e, --end-date=<value>         License end date in YYYY-MM-DD format. Default is no expiration.
  -f, --definition-file=<value>  Path to a JSON file that contains the PSL provisioning request information.
  -l, --license=<value>          Permission Set License name.
  -n, --namespace=<value>        License package namespace.
  -o, --target-org=<value>       (required) Username or alias of the target org.
  -q, --quantity=<value>         Number of licenses to provision.
  -s, --start-date=<value>       License start date in YYYY-MM-DD format. Defaults to today.
      --api-version=<value>      Override the api version used for api requests made by this command.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Provision Permission Set Licenses (PSL) into the target org. Successful execution sets the quantity of seats for the given PSL in the indicated org.

  There are two ways to run this command. You can provide the information to identify a single PSL via command line flags, or provision multiple PSLs in a single call by supplying a JSON formatted file.

  See <Add URL Here> for the format and options contained within the JSON file.

EXAMPLES
  Provision a single Permission Set License into an org:

    $ sf license provision --target-org myScratchOrg --namespace demo --license newLicense --quantity 5 --start-date '2026-03-30' --end-date '2027-03-30'

  Use a JSON formatted input file to provision one or more Permission Set Licenses into an org:

    $ sf license provision --target-org myScratchOrg --definition-file test/config/provisionPSLs.json

HUMAN READABLE OUTPUT

  Success:
  Provisioned 5 licenses for the license definition 'demo__newLicense'

  Success:
  Provisioned 5 licenses for the license definition 'demo__newLicense'
  Provisioned 8 licenses for the license definition 'demo__premiumLicense'

  Error: Failed to provision licenses.
  License Definition not found for 'demo__badLicense'.
  Quantity cannot be negative for 'demo__negativeLicense'.

JSON OUTPUT

  { "status": "success" }

  {
    "status": "error",
    "messages": [
      { "errorCode": "INVALID_LICENSE_DEFINITION", "message": "License definition not found for 'demo__badLicense'" },
      { "errorCode": "INVALID_QUANTITY", "message": "Quantity cannot be negative for 'demo__negativeLicense'" }
    ]
  }
```

_See code: [src/commands/license/provision.ts](https://github.com/salesforcecli/plugin-license-management/blob/1.0.0/src/commands/license/provision.ts)_

<!-- commandsstop -->

# Local Testing

```bash
sf org create scratch --target-dev-hub <devhub-alias> --definition-file test/config/scratch-org-def.json

sf package install --package <package-id> --target-org <scratch-org-username>

sf package install report -i <install-request-id> -o <scratch-org-username>

sf license provision -o <scratch-org-username> --license premium --namespace demo --quantity 10 --start-date '2026-03-20' --end-date '2027-03-20'
```
