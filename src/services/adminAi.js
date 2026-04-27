import { apiFetch } from './api'

export function fetchAdminAiInsights() {
  return apiFetch('/admin-ai/insights')
}

export function sendAdminAiMessage(message, history = []) {
  return apiFetch('/admin-ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  })
}
