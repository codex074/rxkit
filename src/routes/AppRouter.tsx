import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { DrugListPage } from '../pages/DrugListPage'
import { UnitTypesPage } from '../pages/UnitTypesPage'
import { DefaultSetsPage } from '../pages/DefaultSetsPage'
import { CreateFieldUnitPage } from '../pages/CreateFieldUnitPage'
import { FieldUnitDetailPage } from '../pages/FieldUnitDetailPage'
import { PrintChecklistPage } from '../pages/PrintChecklistPage'
import { PrintLabelsPage } from '../pages/PrintLabelsPage'
import { SettingsPage } from '../pages/SettingsPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/drugs" element={<DrugListPage />} />
          <Route
            path="/unit-types"
            element={
              <RoleRoute minRole="admin">
                <UnitTypesPage />
              </RoleRoute>
            }
          />
          <Route
            path="/default-sets"
            element={
              <RoleRoute minRole="admin">
                <DefaultSetsPage />
              </RoleRoute>
            }
          />
          <Route
            path="/field-units/create"
            element={
              <RoleRoute minRole="staff">
                <CreateFieldUnitPage />
              </RoleRoute>
            }
          />
          <Route path="/field-units/:id" element={<FieldUnitDetailPage />} />
          <Route path="/field-units/:id/print-checklist" element={<PrintChecklistPage />} />
          <Route path="/field-units/:id/print-labels" element={<PrintLabelsPage />} />
          <Route
            path="/settings"
            element={
              <RoleRoute minRole="admin">
                <SettingsPage />
              </RoleRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
