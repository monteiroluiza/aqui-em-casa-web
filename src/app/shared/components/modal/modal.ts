import { AfterViewInit, Component, ElementRef, input, OnDestroy, output, viewChild } from '@angular/core';
@Component({
  selector: 'app-modal',
  template: `<dialog #dialog aria-labelledby="modal-title" (cancel)="cancel($event)"><header><h2 id="modal-title">{{ title() }}</h2><button type="button" aria-label="Fechar" [disabled]="busy()" (click)="closed.emit()">×</button></header><ng-content /></dialog>`,
  styles: [`dialog { box-sizing:border-box; width:min(460px, calc(100% - 24px)); max-height:calc(100dvh - 24px); padding:0; border:1px solid var(--color-border); border-radius:18px; background:var(--color-background); color:var(--color-text); } dialog::backdrop { background:var(--color-modal-backdrop); } header { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:20px; border-bottom:1px solid var(--color-border); } h2 { margin:0; font-size:19px; } button { border:0; background:transparent; color:var(--color-text-muted); font-size:26px; cursor:pointer; }`]
})
export class Modal implements AfterViewInit, OnDestroy {
  title = input.required<string>(); busy = input(false); closed = output<void>();
  dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private previous: HTMLElement | null = null;
  ngAfterViewInit() { this.previous = document.activeElement as HTMLElement; this.dialog().nativeElement.showModal(); }
  ngOnDestroy() { this.dialog().nativeElement.close(); this.previous?.focus(); }
  cancel(event: Event) { event.preventDefault(); if (!this.busy()) this.closed.emit(); }
}
