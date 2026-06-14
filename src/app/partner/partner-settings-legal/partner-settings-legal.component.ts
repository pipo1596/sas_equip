import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';
import { PartnerModeService } from '../partner-mode.service';
import { TpSettingsService } from '../../shared/tp-settings.service';

@Component({
  selector: 'app-partner-settings-legal',
  standalone: true,
  imports: [FormsModule, QuillEditorComponent],
  templateUrl: './partner-settings-legal.component.html',
})
export class PartnerSettingsLegalComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(TpSettingsService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);

  readonly editorModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'clean'],
    ],
  };

  form = {
    privcyinfo: '',
    termsinfo:  '',
    retnsinfo:  '',
  };

  async ngOnInit(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.loading.set(true);
    try {
      const s = await this.service.get(tpId);
      this.form = {
        privcyinfo: s.privcyinfo ?? '',
        termsinfo:  s.termsinfo  ?? '',
        retnsinfo:  s.retnsinfo  ?? '',
      };
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Failed to load legal content.');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      await this.service.update('*UPD_LEGAL', tpId, this.form);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save legal content.');
    } finally {
      this.saving.set(false);
    }
  }
}
