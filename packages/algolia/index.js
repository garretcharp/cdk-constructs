import { SingletonFunction, Runtime, Code, Architecture } from '@aws-cdk/aws-lambda'
import { Construct, CustomResource, Duration, SecretValue } from '@aws-cdk/core'
import { readFileSync } from 'fs'
import { join } from 'path'
import Uglify from 'uglify-js'

// NOTE: This is only a subset of the full algolia index settings (https://www.algolia.com/doc/api-reference/settings-api-parameters/)
/**
 * Algolia index settings
 * @typedef {Object} AlgoliaIndexSettings
 * @property {string[]} [searchableAttributes] - The complete list of attributes used for searching.
 * @property {string[]} [attributesForFaceting] - The complete list of attributes used for searching.
 * @property {string[]} [unretrievableAttributes] - The complete list of attributes used for searching.
 * @property {string[]} [attributesToRetrieve] - This parameter controls which attributes to retrieve and which not to retrieve.
 * @property {string[]} [ranking] - Controls how Algolia should sort your results.
 * @property {string[]} [customRanking] - Specifies the custom ranking criterion.
 * @property {string[]} [replicas] - Creates replicas, exact copies of an index.
 * @property {string[]} [queryLanguages] - Sets the languages to be used by language-specific settings and functionalities such as ignorePlurals, removeStopWords, and CJK word-detection.
 * @property {string[]} [indexLanguages] - Sets the languages at the index level for language-specific processing such as tokenization and normalization.
 * @property {string[]} [numericAttributesForFiltering] - List of numeric attributes that can be used as numerical filters.
 * @property {string[]} [allowCompressionOfIntegerArray] - Enables compression of large integer arrays.
 * @property {string[]} [responseFields] - Choose which fields to return in the API response. This parameters applies to search and browse queries.
 */

/**
 * Algolia index properties
 * @typedef {Object} AlgoliaIndexProps
 * @property {string} indexName - Algolia index name
 * @property {AlgoliaIndexSettings} settings - Algolia index settings
 * @property {SecretValue} apiKey - Algolia api key
 * @property {string} appId - Algolia app id
 */

/**
 * Algolia Index Construct
 * @class
 * @property {string} indexName - Algolia index name
 * @property {string} appId - Algolia app id
 */
export class AlgoliaIndex extends Construct {
	/**
	 *
	 * @param {Construct} scope - The scope in which to create the new constructs.
	 * @param {string} id - The id of the new construct.
	 * @param {AlgoliaIndexProps} props - Algolia index properties
	 */
	constructor(scope, id, props) {
		super(scope, id)

		if (!props.indexName) throw new Error('Algolia index name is required')
		else if (typeof props.indexName !== 'string') throw new Error('Algolia index name must be a string')

		if (!props.settings) throw new Error('Algolia index settings are required')
		else if (typeof props.settings !== 'object' || Array.isArray(props.settings)) throw new Error('Algolia index settings must be an object')

		if (!props.apiKey) throw new Error('Algolia api key is required')
		else if (!(props.apiKey instanceof SecretValue)) throw new Error('Algolia api key must be a SecretValue')

		const handler = new SingletonFunction(this, 'AlgoliaIndexHandler', {
			uuid: 'b8f4d49a-74a5-44c5-a99b-bd161bba167a',
			runtime: Runtime.NODEJS_14_X,
			code: Code.fromInline(
				Uglify.minify(
					readFileSync(join(__dirname, 'lambdas', 'index-settings.js'), { encoding: 'utf-8' })
				).code
			),
			handler: 'index.handler',
			lambdaPurpose: 'Custom::AlgoliaIndexHandler',
			timeout: Duration.minutes(1),
			architecture: Architecture.ARM_64
		})

		const resource = new CustomResource(this, 'Resource', {
			serviceToken: handler.functionArn,
			resourceType: 'Custom::AlgoliaIndexResource',
			properties: {
				indexName: props.indexName,
				settings: props.settings,
				apiKey: props.apiKey.toString(),
				appId: props.appId,
			}
		})

		this.indexName = resource.getAtt('indexName').toString()
		this.appId = resource.getAtt('appId').toString()
	}
}
