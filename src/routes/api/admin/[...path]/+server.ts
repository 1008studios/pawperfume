import type { RequestHandler } from './$types';
import { handleAdmin } from '$lib/admin-handler-secure';
import { json } from '@sveltejs/kit';
import { getAdminPassword } from '$lib/auth';

// Special handler for multipart uploads (Vercel Blob)
async function handleUploadBlob(request: Request, headers: Headers) {
	const pass = getAdminPassword();
	if (pass) {
		const token = (headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
		const base64Pass = Buffer.from(pass).toString('base64');
		if (token !== pass && token !== base64Pass) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
	}

	const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
	if (!blobToken) {
		return json({ error: 'BLOB_READ_WRITE_TOKEN not configured' }, { status: 500 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		if (!file) return json({ error: 'No file provided' }, { status: 400 });

		// Determine filename & content-type
		const filename = file.name || 'upload.jpg';
		const contentType = file.type || 'image/jpeg';

		// Upload to Vercel Blob
		const blobRes = await fetch(`https://blob.vercel-storage.com/${encodeURIComponent(filename)}`, {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${blobToken}`,
				'Content-Type': contentType,
				'x-content-type': contentType,
				'x-api-version': '6'
			},
			body: file.stream()
		});

		if (!blobRes.ok) {
			const errText = await blobRes.text();
			console.error('Blob upload error:', errText);
			return json({ error: 'Blob upload failed' }, { status: 500 });
		}

		const blobData = await blobRes.json() as { url: string };
		return json({ url: blobData.url });
	} catch (err) {
		console.error('Upload error:', err);
		return json({ error: 'Upload failed' }, { status: 500 });
	}
}

export const GET: RequestHandler = async (event) => {
	return handleAdmin(event.url.pathname, 'GET', event.request, event.request.headers);
};

export const POST: RequestHandler = async (event) => {
	const route = event.url.pathname.replace('/api/admin', '').replace(/\/$/, '').replace(/^\//, '');
	if (route === 'upload-blob') {
		return handleUploadBlob(event.request, event.request.headers);
	}
	return handleAdmin(event.url.pathname, 'POST', event.request, event.request.headers);
};

export const PUT: RequestHandler = async (event) => {
	return handleAdmin(event.url.pathname, 'PUT', event.request, event.request.headers);
};

export const DELETE: RequestHandler = async (event) => {
	return handleAdmin(event.url.pathname, 'DELETE', event.request, event.request.headers);
};
