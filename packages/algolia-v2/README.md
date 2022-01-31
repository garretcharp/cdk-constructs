# Algolia CDK Construct

This construct allows you to create indexes on Algolia inside of the AWS CDK.

## Usage

```js
import { AlgoliaIndex } from '@garretcharp/cdk-constructs-algolia'
import { SecretValue } from '@aws-cdk/core'

const MyIndex = new AlgoliaIndex(this, 'MyIndex', {
	indexName: `${this.stage}-my-index`,
	// See: https://www.algolia.com/doc/api-reference/settings-api-parameters
	settings: {
		searchableAttributes: ['name']
	},
	apiKey: SecretValue.plainText('my-algolia-api-key'),
	appId: 'my-algolia-app-id'
})
```
