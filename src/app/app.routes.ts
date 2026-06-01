import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MenuComponent } from './pages/menu/menu.component';
import { DonatorCreateComponent } from './pages/donator-create/donator-create.component';
import { DonatorSearchComponent } from './pages/donator-search/donator-search.component';
import { DonatorSummaryComponent } from './pages/donator-summary/donator-summary.component';
import { ReceiptCreateComponent } from './pages/receipt-create/receipt-create.component';
import { ReceiptSearchComponent } from './pages/receipt-search/receipt-search.component';
import { AdminMenuComponent } from './pages/admin-menu/admin-menu.component';
import { UserCreateComponent } from './pages/user-create/user-create.component';
import { UserListComponent } from './pages/user-list/user-list.component';
import { UserSummaryComponent } from './pages/user-summary/user-summary.component';
import { authGuard, authMatchGuard, loginGuard, rootRedirectGuard } from './guards/auth.guard';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', canMatch: [rootRedirectGuard], component: LoginComponent },
	{ path: 'login', component: LoginComponent, canMatch: [loginGuard] },
	{ path: 'menu', component: MenuComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: 'donator/new', component: DonatorCreateComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: 'donator/search', component: DonatorSearchComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: 'donator/:id', component: DonatorSummaryComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: 'receipt/new', component: ReceiptCreateComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: 'receipt/search', component: ReceiptSearchComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: 'admin', component: AdminMenuComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: 'admin/user/new', component: UserCreateComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: 'admin/user/list', component: UserListComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: 'admin/user/:id', component: UserSummaryComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: '**', redirectTo: 'login' }
];
