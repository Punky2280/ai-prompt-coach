export async function chat(prompt: string) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
  
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  