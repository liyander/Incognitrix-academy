import { apiFetch } from '../services/api'

export const defaultCves = [
  {
    id: 1,
    cve_id: 'CVE-2021-44228',
    short_description: 'Log4Shell Vulnerability in Apache Log4j.',
    found_year: 2021,
    credit: 'Chen Zhaojun of Alibaba Cloud Security Team',
    vulnerability_report: 'Apache Log4j2 <=2.14.1 JNDI features used in configuration, log messages, and parameters do not protect against attacker controlled LDAP and other JNDI related endpoints. An attacker who can control log messages or log message parameters can execute arbitrary code loaded from LDAP servers when message lookup substitution is enabled.',
    method_followed: 'Identified during a routine security audit of Java-based web application architectures using JNDI lookup mechanisms.',
    references_text: 'https://nvd.nist.gov/vuln/detail/CVE-2021-44228\nhttps://logging.apache.org/log4j/2.x/security.html',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

export function getCvesData() {
  const stored = localStorage.getItem('cvesData')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('Error parsing cvesData:', e)
      return defaultCves
    }
  }
  return defaultCves
}

export function setCvesData(cves) {
  localStorage.setItem('cvesData', JSON.stringify(cves))
}

export function getCveById(id) {
  const cves = getCvesData()
  return cves.find((cve) => String(cve.id) === String(id) || String(cve.cve_id) === String(id)) || null
}

export function addCve(cve) {
  const cves = getCvesData()
  const newCve = {
    ...cve,
    id: `local-${Date.now()}` // Temporary until backend syncs real ID
  }
  cves.unshift(newCve)
  setCvesData(cves)

  void apiFetch('/cves', {
    method: 'POST',
    body: JSON.stringify(cve)
  }).then(saved => {
    // Replace temp local ID if needed, or simply let the next fetch pull it
    const list = getCvesData()
    const index = list.findIndex(c => c.id === newCve.id)
    if (index !== -1) {
      list[index] = { ...list[index], ...saved }
      setCvesData(list)
    }
  }).catch((error) => console.error('Failed to sync cve create:', error))
  
  return newCve
}

export function updateCve(id, updates) {
  const cves = getCvesData()
  const index = cves.findIndex((cve) => String(cve.id) === String(id) || String(cve.cve_id) === String(id))
  
  if (index !== -1) {
    cves[index] = { ...cves[index], ...updates, updated_at: new Date().toISOString() }
    setCvesData(cves)
    
    // If it's not a local temporary ID, push to API
    if (!String(cves[index].id).startsWith('local-')) {
      void apiFetch(`/cves/${cves[index].id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      }).catch((error) => console.error('Failed as cve update:', error))
    }
    return cves[index]
  }
  return null
}

export function deleteCve(id) {
  let cves = getCvesData()
  const originalLength = cves.length
  cves = cves.filter((cve) => String(cve.id) !== String(id) && String(cve.cve_id) !== String(id))
  
  if (cves.length < originalLength) {
    setCvesData(cves)
    if (!String(id).startsWith('local-')) {
      void apiFetch(`/cves/${id}`, {
        method: 'DELETE'
      }).catch((error) => console.error('Failed to sync cve delete:', error))
    }
    return true
  }
  return false
}

export function hydrateCvesData(cvesFromServer) {
  if (Array.isArray(cvesFromServer) && cvesFromServer.length > 0) {
    setCvesData(cvesFromServer)
  }
}
