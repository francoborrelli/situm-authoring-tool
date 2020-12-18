import { Component } from '@angular/core';
import {
  Platform,
  ViewController,
  NavParams,
  AlertController,
} from 'ionic-angular';
import { GameService } from '../../../services/game.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { User } from '../../../services/login.service';
import { environment } from '../../../env/environment';

@Component({
  selector: 'page-endGameModal',
  templateUrl: 'endGameModal.html',
})
export class EndGameModal {
  form: FormGroup;

  user: User;

  isLoading = false;
  workspace: any;

  constructor(
    public platform: Platform,
    public viewCtrl: ViewController,
    private gameService: GameService,
    public alertCtrl: AlertController,
    public navParams: NavParams,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      code: ['', Validators.required],
    });

    this.user = this.navParams.get('user');
    this.workspace = this.navParams.get('workspace');
  }

  onSubmit() {
    if (!this.hasCode) {
      this.saveResult();
    } else {
      if (this.formValue === this.code) {
        this.saveResult();
      } else {
        this.form.get('code').setErrors({ invalid: true });
      }
    }
  }

  private saveResult() {
    this.isLoading = true;
    this.gameService
      .saveScore(this.user)
      .then((value) => {
        this.isLoading = false;

        this.dismiss();

        if (value) {
          return this.alertText(
            'Felicitaciones',
            'Tus resultados se han guardado correctamente.'
          );
        }
      })
      .catch(() => {
        this.isLoading = false;
        this.alertText(
          'Lo siento',
          'Ocurrió un error al guardar tus resultados.'
        );
      });
  }

  private dismiss() {
    this.viewCtrl.dismiss();
  }

  private alertText(aTitle, aSubTitle) {
    let alert = this.alertCtrl.create({
      title: aTitle,
      subTitle: aSubTitle,
      buttons: ['Cerrar'],
    });
    alert.present();
  }

  get formValue(): string {
    return this.form.get('code').value;
  }

  get isValid() {
    return this.hasCode ? this.form.valid : true;
  }

  get code(): string {
    return this.workspace.configuration.code;
  }

  get hasCode(): boolean {
    return this.workspace.configuration.showCode;
  }

  get hasPoints(): boolean {
    return this.workspace.configuration.showScore;
  }

  get hasTime(): boolean {
    return this.workspace.configuration.time;
  }

  get points(): number {
    return this.gameService.score;
  }

  get time(): number {
    return this.gameService.time;
  }
}
