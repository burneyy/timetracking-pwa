import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { resetDevelopmentDatabaseForSchemaChange } from './db/db'

async function bootstrap() {
  await resetDevelopmentDatabaseForSchemaChange()
  const { default: App } = await import('./App.tsx')

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
