import { Component, OnInit, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgClass } from '@angular/common';
import { QuillEditorComponent } from 'ngx-quill';
import type { ContentChange } from 'ngx-quill';
import { PartnerModeService } from '../partner-mode.service';
import { TpSettingsService } from '../../shared/tp-settings.service';
import type { TpSettings } from '../../shared/tp-settings.model';

@Component({
  selector: 'app-partner-settings-legal',
  standalone: true,
  imports: [FormsModule, QuillEditorComponent, DecimalPipe, NgClass],
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

  readonly maxLength  = 65535;
  readonly chunkSize  = 10000;
  readonly chunkCount = 7;

  readonly privacyCharCount = signal(0);
  readonly termsCharCount   = signal(0);
  readonly returnsCharCount = signal(0);

  readonly editorModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'clean'],
    ],
  };

  form = { privcyinfo: '', termsinfo: '', retnsinfo: '' };

  private splitChunks(prefix: string, text: string): Partial<TpSettings> {
    const result: Record<string, string> = {};
    for (let i = 1; i <= this.chunkCount; i++) {
      result[`${prefix}${i}`] = text.slice((i - 1) * this.chunkSize, i * this.chunkSize);
    }
    return result as Partial<TpSettings>;
  }

  async ngOnInit(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.loading.set(true);
    try {
      const s = await this.service.getfull(tpId);
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

  onEditorCreated(quill: { getLength(): number }, countSignal: WritableSignal<number>): void {
    countSignal.set(Math.max(0, quill.getLength() - 1));
  }

  onContentChanged(event: ContentChange, countSignal: WritableSignal<number>): void {
    const length = event.editor.getLength() - 1;
    if (length > this.maxLength) {
      event.editor.deleteText(this.maxLength, event.editor.getLength());
      countSignal.set(this.maxLength);
    } else {
      countSignal.set(Math.max(0, length));
    }
  }

  async save(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      const payload: Partial<TpSettings> = {
        ...this.splitChunks('privcyinfo', this.form.privcyinfo),
        ...this.splitChunks('termsinfo',  this.form.termsinfo),
        ...this.splitChunks('retnsinfo',  this.form.retnsinfo),
      };
      await this.service.update('*UPD_LEGAL', tpId, payload);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save legal content.');
    } finally {
      this.saving.set(false);
    }
  }
}
