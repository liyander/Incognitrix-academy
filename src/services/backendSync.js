import { apiFetch } from './api'
import { hydrateCareerPathsData } from '../data/careerPathsData'
import { hydrateRoomsData } from '../data/roomsData'
import { savePlatformConfig } from '../platformConfig'
import { syncLabProgressFromBackend } from './labProgress'

export async function syncFrontendStateFromBackend() {
  const [rooms, careerPaths, platformConfig] = await Promise.all([
    apiFetch('/rooms'),
    apiFetch('/career-paths'),
    apiFetch('/platform-config'),
  ])

  hydrateRoomsData(Array.isArray(rooms) ? rooms : [])
  hydrateCareerPathsData(Array.isArray(careerPaths) ? careerPaths : [])

  if (platformConfig?.routes || platformConfig?.features) {
    savePlatformConfig(platformConfig)
  }

  await syncLabProgressFromBackend()

  return {
    rooms,
    careerPaths,
    platformConfig,
  }
}
