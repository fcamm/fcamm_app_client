import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MenuComponent } from './pages/menu/menu.component';
import { DonatorCreateComponent } from './pages/donator-create/donator-create.component';
import { DonatorSearchComponent } from './pages/donator-search/donator-search.component';
import { ReceiptCreateComponent } from './pages/receipt-create/receipt-create.component';
import { ReceiptSearchComponent } from './pages/receipt-search/receipt-search.component';
import { authGuard, authMatchGuard, loginGuard, rootRedirectGuard } from './guards/auth.guard';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', canMatch: [rootRedirectGuard], component: LoginComponent },
	{ path: 'login', component: LoginComponent, canMatch: [loginGuard] },
	{ path: 'menu', component: MenuComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: 'donator/new', component: DonatorCreateComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: 'donator/search', component: DonatorSearchComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: 'receipt/new', component: ReceiptCreateComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: 'receipt/search', component: ReceiptSearchComponent, canActivate: [authGuard], canMatch: [authMatchGuard] },
	{ path: '**', redirectTo: 'login' }
];
