const HOLDED_API_KEY = process.env.HOLDED_API_KEY;

export function holdedHeaders() {
  return {
    'key': HOLDED_API_KEY as string,
    'Content-Type': 'application/json'
  };
}

export async function holdedGet(path: string) {
  const response = await fetch(`https://api.holded.com${path}`, {
    headers: holdedHeaders()
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Holded API Error ${response.status}: ${errorText}`);
  }
  return response.json();
}
