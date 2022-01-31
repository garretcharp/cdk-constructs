import { SingletonFunction, Runtime, Code, Architecture } from '@aws-cdk/aws-lambda'
import { Construct, CustomResource, Duration, SecretValue } from '@aws-cdk/core'
import { join } from 'path'
import { readFileSync } from 'fs'

import Uglify from 'uglify-js'

// NOTE: This is only a subset of the full algolia index settings (https://www.algolia.com/doc/api-reference/settings-api-parameters/)
export interface AlgoliaIndexSettings {
	searchableAttributes?: string[] | null
	attributesForFaceting?: string[] | null
	unretrievableAttributes?: string[] | null
	attributesToRetrieve?: string[] | null
	ranking?: string[] | null
	customRanking?: string[] | null
	replicas?: string[] | null
	queryLanguages?: string[] | null
	indexLanguages?: string[] | null
	numericAttributesForFiltering?: string[] | null
	allowCompressionOfIntegerArray?: string[] | null
	responseFields?: string[] | null
	[key: string]: any
}

export interface AlgoliaIndexProps {
	indexName: string
	settings: AlgoliaIndexSettings
	apiKey: SecretValue
	appId: string
}

export class AlgoliaIndex extends Construct {
	public readonly indexName: string
	public readonly appId: string

	constructor(scope: Construct, id: string, props: AlgoliaIndexProps) {
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
