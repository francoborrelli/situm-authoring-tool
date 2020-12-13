import { Component } from '@angular/core';
import { NavParams, Platform, ViewController } from 'ionic-angular';
import { QuestionService } from '../../services/question.service';
import { Workspace } from '../../services/workspace.service';

@Component({
  selector: 'question-modalInformation',
  templateUrl: 'questionsModal.html',
})
export class QuestionsInformationModal {
  timer: any;
  questions: any = [];
  workspace: Workspace;

  constructor(
    public platform: Platform,
    public viewCtrl: ViewController,
    private navParams: NavParams,
    public questionService: QuestionService
  ) {
    this.workspace = this.navParams.get('workspace');
    this.questionService
      .getAllQuestions(this.workspace.idWorkspace)
      .toPromise()
      .then((questions) => {
        this.questions = questions;
        console.log(questions);
      });
  }

  dismiss() {
    this.viewCtrl.dismiss();
  }
  ionViewDidEnter() {
    this.timer = setTimeout(() => this.dismiss(), 10000);
  }
}
