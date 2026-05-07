import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings/settings.component';

@NgModule({
  imports: [CommonModule, SettingsRoutingModule, SettingsComponent],
})
export class SettingsModule {}
