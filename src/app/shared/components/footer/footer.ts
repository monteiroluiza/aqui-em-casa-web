import { Component, inject, input, model } from '@angular/core';
import { Router } from '@angular/router';
import { Icon } from '../../icon';

export type FooterSection = 'estoque' | 'compras' | 'casa';

@Component({
  selector: 'app-footer',
  imports: [Icon],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  private readonly router = inject(Router);
  navigate(section: FooterSection) {
    void this.router.navigateByUrl(section === 'casa' ? '/casa' : section === 'compras' ? '/compras' : '/inicio');
  }
  readonly activeSection = model<FooterSection>('estoque');
  readonly stockCount = input(0);
  readonly houseCount = input(0);

  readonly items = [
    { id: 'estoque', label: 'Estoque', icon: 'box' },
    { id: 'compras', label: 'Compras', icon: 'cart' },
    { id: 'casa', label: 'Casa', icon: 'home' },
  ] as const;

  count(section: FooterSection): number {
    const value = section === 'estoque' ? this.stockCount() : section === 'casa' ? this.houseCount() : 0;
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }
}
