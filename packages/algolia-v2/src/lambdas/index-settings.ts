import type { ClientRequest } from 'http'
import https from 'https'

function promisifiedRequest(url: string, options: https.RequestOptions, modifyRequest = (req: ClientRequest) => {}) {
	return new Promise((resolve, reject) => {
		const request = https.request(url, options, response => {
			let data = ''

			response.setEncoding('utf8')
			response.on('data', chunk => data += chunk.toString())

			response.on('error', error => reject(error))

			response.on('end', () => {
				const { statusCode, headers } = response

				return statusCode && statusCode >= 200 && statusCode < 300 ? resolve({ statusCode, headers, data }) : reject('Request failed with status code: ' + statusCode)
			})
		})

		request.on('error', error => reject(error))

		modifyRequest(request)

		request.end()
	})
}

async function sendResponse (event: any, Status: 'SUCCESS' | 'FAILED', Reason: string, PhysicalResourceId: string, Data: any) {
	const response = JSON.stringify({
		Status,
		Reason,
		PhysicalResourceId,
		StackId: event.StackId,
		RequestId: event.RequestId,
		LogicalResourceId: event.LogicalResourceId,
		Data
	})

	return promisifiedRequest(event.ResponseURL, {
		method: 'PUT',
		headers: {
			'Content-Type': '',
			'Content-Length': response.length
		}
	}, request => request.write(response))
}

async function createOrUpdateIndex(event: any) {
	const { indexName, settings, appId, apiKey } = event.ResourceProperties

	await promisifiedRequest(`https://${appId}.algolia.net/1/indexes/${indexName}/settings`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(JSON.stringify(settings)),
			'X-Algolia-API-Key': apiKey,
			'X-Algolia-Application-Id': appId,
		}
	}, request => request.write(JSON.stringify(settings)))

	return {
		PhysicalResourceId: `${appId}::${indexName}`,
		Data: {
			appId,
			indexName
		}
	}
}

async function deleteIndex(event: any) {
	const { indexName, appId, apiKey } = event.ResourceProperties

	await promisifiedRequest(`https://${appId}.algolia.net/1/indexes/${indexName}`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			'X-Algolia-API-Key': apiKey,
			'X-Algolia-Application-Id': appId
		}
	})
}

export const handler = async (event: any) => {
	let PhysicalResourceId = 'None', Data = {}

	try {
		switch (event.RequestType) {
			case 'Create':
			case 'Update':
				({ PhysicalResourceId, Data } = await createOrUpdateIndex(event))
				break

			case 'Delete':
				await deleteIndex(event)
				break
		}

		return sendResponse(event, 'SUCCESS', 'Ok', PhysicalResourceId, Data)
	} catch (error) {
		return sendResponse(event, 'FAILED', (error as Error).message || 'Internal Error', PhysicalResourceId, {})
	}
}
