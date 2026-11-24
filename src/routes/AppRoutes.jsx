import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import { ACTION, MENU } from '../lib/permissions.js';
import ChangePasswordPage from '../pages/ChangePasswordPage.jsx';
import CompanyFormPage from '../pages/CompanyFormPage.jsx';
import CompanyListPage from '../pages/CompanyListPage.jsx';
import CustomerFormPage from '../pages/CustomerFormPage.jsx';
import CustomerListPage from '../pages/CustomerListPage.jsx';
import GeographyPage from '../pages/GeographyPage.jsx';
import ServiceRequestFormPage from '../pages/ServiceRequestFormPage.jsx';
import ServiceRequestListPage from '../pages/ServiceRequestListPage.jsx';
import SurveyPage from '../pages/SurveyPage.jsx';
import ServiceTypesPage from '../pages/ServiceTypesPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import MenuAccessPage from '../pages/MenuAccessPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import OrganizationFormPage from '../pages/OrganizationFormPage.jsx';
import OrganizationListPage from '../pages/OrganizationListPage.jsx';
import OverviewPage from '../pages/OverviewPage.jsx';
import ParameterFormPage from '../pages/ParameterFormPage.jsx';
import ParametersPage from '../pages/ParametersPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import RoleFormPage from '../pages/RoleFormPage.jsx';
import RoleListPage from '../pages/RoleListPage.jsx';
import UserFormPage from '../pages/UserFormPage.jsx';
import UserListPage from '../pages/UserListPage.jsx';
import GuestRoute from './GuestRoute.jsx';
import PermissionRoute from './PermissionRoute.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />

          <Route element={<PermissionRoute menu={MENU.USERS} />}>
            <Route path="/users" element={<UserListPage />} />
          </Route>
          <Route element={<PermissionRoute menu={MENU.USERS} action={ACTION.CREATE} />}>
            <Route path="/users/new" element={<UserFormPage />} />
          </Route>
          <Route element={<PermissionRoute menu={MENU.USERS} action={ACTION.EDIT} />}>
            <Route path="/users/:id/edit" element={<UserFormPage />} />
          </Route>

          <Route element={<PermissionRoute menu={MENU.ROLES} />}>
            <Route path="/roles" element={<RoleListPage />} />
          </Route>
          <Route element={<PermissionRoute menu={MENU.ROLES} action={ACTION.CREATE} />}>
            <Route path="/roles/new" element={<RoleFormPage />} />
          </Route>
          <Route element={<PermissionRoute menu={MENU.ROLES} action={ACTION.EDIT} />}>
            <Route path="/roles/:id/edit" element={<RoleFormPage />} />
          </Route>

          <Route element={<PermissionRoute menu={MENU.CUSTOMER} />}>
            <Route path="/customers" element={<CustomerListPage />} />
          </Route>
          <Route element={<PermissionRoute menu={MENU.CUSTOMER} action={ACTION.CREATE} />}>
            <Route path="/customers/new" element={<CustomerFormPage />} />
          </Route>
          <Route element={<PermissionRoute menu={MENU.CUSTOMER} action={ACTION.EDIT} />}>
            <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
          </Route>

          <Route element={<PermissionRoute menu={MENU.COMPANY} />}>
            <Route path="/companies" element={<CompanyListPage />} />
          </Route>
          <Route element={<PermissionRoute menu={MENU.COMPANY} action={ACTION.CREATE} />}>
            <Route path="/companies/new" element={<CompanyFormPage />} />
          </Route>
          <Route element={<PermissionRoute menu={MENU.COMPANY} action={ACTION.EDIT} />}>
            <Route path="/companies/:id/edit" element={<CompanyFormPage />} />
          </Route>

          <Route element={<PermissionRoute menu={MENU.GEOGRAPHY} />}>
            <Route path="/geography" element={<GeographyPage />} />
          </Route>

          <Route element={<PermissionRoute menu={MENU.SERVICE_REQUESTS} />}>
            <Route path="/service-requests" element={<ServiceRequestListPage />} />
          </Route>
          <Route element={<PermissionRoute menu={MENU.SERVICE_REQUESTS} action={ACTION.CREATE} />}>
            <Route path="/service-requests/new" element={<ServiceRequestFormPage />} />
          </Route>
          <Route element={<PermissionRoute menu={MENU.SERVICE_REQUESTS} action={ACTION.EDIT} />}>
            <Route path="/service-requests/:id/edit" element={<ServiceRequestFormPage />} />
            <Route path="/service-requests/:id/survey" element={<SurveyPage />} />
          </Route>

          <Route element={<PermissionRoute menu={MENU.SERVICE_TYPES} />}>
            <Route path="/service-types" element={<ServiceTypesPage />} />
          </Route>

          <Route element={<PermissionRoute menu={MENU.PARAMETERS} />}>
            <Route path="/parameters" element={<ParametersPage />} />
          </Route>
          <Route element={<PermissionRoute menu={MENU.PARAMETERS} action={ACTION.CREATE} />}>
            <Route path="/parameters/:kind/new" element={<ParameterFormPage />} />
          </Route>
          <Route element={<PermissionRoute menu={MENU.PARAMETERS} action={ACTION.EDIT} />}>
            <Route path="/parameters/:kind/:id/edit" element={<ParameterFormPage />} />
          </Route>

          <Route element={<PermissionRoute menu={MENU.ORGANIZATIONS} />}>
            <Route path="/organizations" element={<OrganizationListPage />} />
          </Route>
          <Route element={<PermissionRoute menu={MENU.ORGANIZATIONS} action={ACTION.CREATE} />}>
            <Route path="/organizations/new" element={<OrganizationFormPage />} />
          </Route>
          <Route element={<PermissionRoute menu={MENU.ORGANIZATIONS} action={ACTION.EDIT} />}>
            <Route path="/organizations/:id/edit" element={<OrganizationFormPage />} />
          </Route>

          <Route element={<PermissionRoute menu={MENU.MENU_ACCESS} />}>
            <Route path="/menu-access" element={<MenuAccessPage />} />
          </Route>

          <Route path="/account/profile" element={<ProfilePage />} />
          <Route path="/account/password" element={<ChangePasswordPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
