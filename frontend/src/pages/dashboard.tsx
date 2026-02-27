import { DashboardThemeProvider, useDashboardTheme } from "../components/dashboard/theme-context"
import DashboardLayout from "../components/dashboard/dashboard-layout"
import { OverviewTab } from "../components/dashboard/overview-tab"
import ProjectsTab from "../components/dashboard/projects-tab"
import UploadTab from "../components/dashboard/upload-tab"
import Viewer3DTab from "../components/dashboard/viewer-3d-tab"
import MapTab from "../components/dashboard/map-tab"
import TutorialTab from "../components/dashboard/tutorial-tab"
import SettingsTab from "../components/dashboard/settings-tab"

function DashboardContent() {
  const { activeTab } = useDashboardTheme()

  return (
    <DashboardLayout>
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'projects' && <ProjectsTab />}
      {activeTab === 'upload' && <UploadTab />}
      {activeTab === 'viewer' && <Viewer3DTab />}
      {activeTab === 'geomap' && <MapTab />}
      {activeTab === 'tutorial' && <TutorialTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </DashboardLayout>
  )
}

export default function Dashboard() {
  return (
    <DashboardThemeProvider>
      <DashboardContent />
    </DashboardThemeProvider>
  )
}
