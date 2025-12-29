import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputBarWithButtonComponent } from './input-bar-with-button.component';

describe('InputBarWithButtonComponent', () => {
  let component: InputBarWithButtonComponent;
  let fixture: ComponentFixture<InputBarWithButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputBarWithButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputBarWithButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
