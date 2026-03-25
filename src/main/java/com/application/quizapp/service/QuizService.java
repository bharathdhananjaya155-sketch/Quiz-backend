package com.application.quizapp.service;

import com.application.quizapp.entity.Questions;
import com.application.quizapp.entity.QuestionsWrapper;
import com.application.quizapp.entity.Quiz;
import com.application.quizapp.entity.Response;
import com.application.quizapp.repository.QuestionRepositary;
import com.application.quizapp.repository.QuizRepositary;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class QuizService {

    private final QuestionRepositary questionRepositary;
    private final QuizRepositary quizRepositary;


    public ResponseEntity<String> createQuiz(String category, int numQ, String title) {

        List<Questions> questions=questionRepositary.findRandomQuestion(category,numQ);
        Quiz quiz=new Quiz();

        quiz.setTitle(title);
        quiz.setQuestions(questions);

        quizRepositary.save(quiz);

        return new ResponseEntity<>("Success", HttpStatus.CREATED);
    }

    public ResponseEntity<List<QuestionsWrapper>> getQuiz(Integer id) {

        Optional<Quiz> quiz =quizRepositary.findById(id);

        List<Questions> questionsListDb =quiz.get().getQuestions();

        List<QuestionsWrapper> questionsWrappersForUser =new ArrayList<>();

        for(Questions q:questionsListDb){
            QuestionsWrapper questionsWrapper=new QuestionsWrapper(q.getId(),q.getQuestionTitle(),q.getOption1(),
                    q.getOption2(),q.getOption3(),q.getOption4());
            questionsWrappersForUser.add(questionsWrapper);
        }
        return new ResponseEntity<>(questionsWrappersForUser,HttpStatus.OK)
;    }

    public ResponseEntity<Integer> calculateresult(Integer id, List<Response> responses) {
        Quiz quiz =quizRepositary.findById(id).get();
        List<Questions> questionsList=quiz.getQuestions();

        int right=0;
        int i=0;
        for(Response r:responses){
            if(r.getResponse().equals(questionsList.get(i).getRightAnswer())){
                right++;
            }
            i++;
        }

        return new ResponseEntity<>(right,HttpStatus.OK);

    }
}
