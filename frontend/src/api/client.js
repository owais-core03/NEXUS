/**
 * NEXUS Frontend API Client
 * Communicates with FastAPI backend via /api endpoints.
 * Never stores or transmits secrets from the client.
 */

export async function checkHealth() {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json();
}

export async function createInvestigation(address, chainId = 1) {
  const response = await fetch('/api/investigations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address, chain_id: chainId }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Investigation creation failed (${response.status})`);
  }
  return response.json();
}

export async function getInvestigation(id) {
  const response = await fetch(`/api/investigations/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to load investigation (${response.status})`);
  }
  return response.json();
}

export async function getInvestigationTransactions(id, recordType = null) {
  let url = `/api/investigations/${id}/transactions`;
  if (recordType) {
    url += `?record_type=${encodeURIComponent(recordType)}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load transactions (${response.status})`);
  }
  return response.json();
}

export async function getInvestigationSummary(id) {
  const response = await fetch(`/api/investigations/${id}/summary`);
  if (!response.ok) {
    throw new Error(`Failed to load summary (${response.status})`);
  }
  return response.json();
}
