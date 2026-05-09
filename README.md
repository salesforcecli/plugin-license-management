# License Management Plugin

[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-license-management.svg?label=@salesforce/plugin-license-management)](https://www.npmjs.com/package/@salesforce/plugin-license-management) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-license-management.svg)](https://npmjs.org/package/@salesforce/plugin-license-management) [![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/license/apache-2-0)

Manage Permission Set Licenses (PSLs) in your scratch orgs. This plugin lets you provision PSL seats into a target scratch org — either one at a time via command line flags, or in bulk using a JSON definition file.

## Before You Begin

- Install and authenticate the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli).
- Ensure you have the appropriate permissions to manage Permission Set Licenses in the target org.

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
  $ sf license provision -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-n <value> | -f <value>]
    [-l <value> | ] [-q <value> | ]

FLAGS
  -f, --definition-file=<value>  Path to a JSON file that contains the PSL provisioning request information.
  -l, --license=<value>          Permission Set License name.
  -n, --namespace=<value>        License package namespace.
  -o, --target-org=<value>       (required) Username or alias of the target org. Not required if the `target-org`
                                 configuration variable is already set.
  -q, --quantity=<value>         Number of licenses to provision.
      --api-version=<value>      Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Provision Permission Set Licenses (PSL) into a target org.

  Provision Permission Set Licenses (PSL) into the target org. Successful execution sets the quantity of seats for the
  given PSL in the indicated org.

  There are two ways to run this command. You can provide the information to identify a single PSL via command line
  flags, or provision multiple PSLs in a single call by supplying a JSON formatted file.

  See https://github.com/salesforcecli/plugin-license-management#sf-license-provision for the format and options
  contained within the JSON file.

EXAMPLES
  Provision a single Permission Set License into an org:

    $ sf license provision --target-org myScratchOrg --namespace demo --license newLicense --quantity 5

  Use a JSON formatted input file to provision one or more Permission Set Licenses into an org:

    $ sf license provision --target-org myScratchOrg --definition-file test/config/provisionPSLs.json
```

_See code: [src/commands/license/provision.ts](https://github.com/salesforcecli/plugin-license-management/blob/1.1.2/src/commands/license/provision.ts)_

<!-- commandsstop -->

# Local Testing

### 1. Log in to your Dev Hub

```bash
sf org login web --set-default-dev-hub --instance-url <dev-hub-url>
```

### 2. Create a scratch org

Before creating the scratch org, update `test/config/scratch-org-def.json` with your values:

| Field       | Description                          |
| ----------- | ------------------------------------ |
| `orgName`   | Display name for the scratch org     |
| `namespace` | Your package namespace (e.g. `myNS`) |

```bash
sf org create scratch --definition-file test/config/scratch-org-def.json --alias <scratch-org-alias>
```

### 3. Install the package into the scratch org

Make the package available in the scratch org. Some ways to do this include:

**Install a released package version**

```bash
sf package install --package <package-version-id> --target-org <scratch-org-alias>
```

**Push source directly**

```bash
sf project deploy start --target-org <scratch-org-alias>
```

### 4. Open the scratch org (optional)

```bash
sf org open --target-org <scratch-org-alias>
```

### 5. Provision licenses

```bash
# Provision a single PSL
sf license provision --target-org <scratch-org-alias> --namespace <namespace> --license <license-name> --quantity <number>

# Provision multiple PSLs using a definition file
sf license provision --target-org <scratch-org-alias> --definition-file <path-to-definition-file>
```
