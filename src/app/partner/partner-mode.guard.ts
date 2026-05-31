import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { PartnerModeService } from './partner-mode.service';

export const partnerModeGuard: CanActivateChildFn = () => {
  const partnerMode = inject(PartnerModeService);
  const router = inject(Router);
  const partner = partnerMode.activePartner();
  if (partner) {
    return router.createUrlTree(['/partner', partner.tpId, 'settings']);
  }
  return true;
};
