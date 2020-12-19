import { Component } from '@angular/core';
import {
  AlertController,
  ModalController,
  NavParams,
  Platform,
  ToastController,
  ViewController,
} from 'ionic-angular';
import { QuestionService } from '../../services/question.service';
import { Workspace } from '../../services/workspace.service';
import { AddQuestion } from '../addQuestion/addQuestion';

@Component({
  selector: 'question-modalInformation',
  templateUrl: 'questionsModal.html',
})
export class QuestionsInformationModal {
  timer: any;
  questions: any = [];
  workspace: Workspace;
  user: any;

  constructor(
    public platform: Platform,
    public viewCtrl: ViewController,
    private navParams: NavParams,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
    public questionService: QuestionService
  ) {
    this.workspace = this.navParams.get('workspace');
    this.user = this.navParams.get('loggedUser');

    this.questionService
      .getAllQuestions(this.workspace.idWorkspace)
      .subscribe((questions) => {
        this.questions = questions;
      });
  }

  dismiss() {
    this.viewCtrl.dismiss();
  }

  editQuestion(question: any) {
    let editQuestionModal = this.modalCtrl.create(AddQuestion, {
      question,
      workspace: this.workspace,
      loggedUser: this.user,
      isEdit: true,
    }); //Le paso el poi casi completo

    editQuestionModal.onDidDismiss((questionResultado) => {
      //CUANDO SE CIERRE EL MODAL VUELVE CON DATOS
      if (questionResultado) {
        this.questionService
          .updateQuestion(questionResultado, this.workspace.idWorkspace)
          .then((resPromesa) => {})
          .catch((e) => console.log(e));
      }
    });
    editQuestionModal.present();
  }

  removeQuestion(question: any) {
    let alert = this.alertCtrl.create({
      title: '¿Estás seguro/a que deseas borrar esta pregunta?',
      message: `Si continuas con esta acción se eliminará la pregunta "${question.question}"`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {},
        },
        {
          text: 'Confirmar',
          handler: () => {
            this.questionService
              .deleteQuestion(question)
              .then(() => {
                const toast = this.toastCtrl.create({
                  message: 'Pregunta eliminada correctamente.',
                  duration: 3000,
                });
                toast.present();
                this.questions = this.questions.filter((q) => q !== question);
              })
              .catch(() => {
                const toast = this.toastCtrl.create({
                  message: 'La pregunta no pudo ser eliminada.',
                  duration: 3000,
                });
                toast.present();
              });
          },
        },
      ],
    });
    alert.present();
  }

  get amount() {
    return (this.questions || []).length ? `(${this.questions.length})` : '';
  }

  ionViewDidEnter() {
    this.timer = setTimeout(() => this.dismiss(), 10000);
  }
}
