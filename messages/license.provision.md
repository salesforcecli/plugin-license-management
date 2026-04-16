# summary

Provision Permission Set Licenses (PSL) into a target org.

# description

Provision Permission Set Licenses (PSL) into the target org. Successful execution sets the quantity of seats for the given PSL in the indicated org.

There are two ways to run this command. You can provide the information to identify a single PSL via command line flags, or provision multiple PSLs in a single call by supplying a JSON formatted file.

See <Add URL Here> for the format and options contained within the JSON file.

# flags.namespace.summary

License package namespace.

# flags.license.summary

Permission Set License name.

# flags.quantity.summary

Number of licenses to provision.

# flags.definition-file.summary

Path to a JSON file that contains the PSL provisioning request information.

# examples

- Provision a single Permission Set License into an org:

  <%= config.bin %> <%= command.id %> --target-org myScratchOrg --namespace demo --license newLicense --quantity 5

- Use a JSON formatted input file to provision one or more Permission Set Licenses into an org:

  <%= config.bin %> <%= command.id %> --target-org myScratchOrg --definition-file test/config/provisionPSLs.json

# success.traceId

Trace ID: %s

# error.missingLicenseFlag

Either --license or --definition-file is required.

# error.emptyDefinitionFile

The definition file must contain at least one license entry.

# error.unsupportedDefinitionFileFields

Nonexistent fields: %s

# error.missingRequiredDefinitionFileFields

Missing required fields: %s

# error.provisionFailed

Failed to provision licenses. %s

# success

Success:

# success.column.licenseDefinition

License Definition

# success.column.provisionedQuantity

Provisioned Quantity
