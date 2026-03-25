package com.application.quizapp.service;


import com.application.quizapp.entity.Questions;
import com.application.quizapp.repository.QuestionRepositary;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor

public class QuestionService {

    private final QuestionRepositary questionRepositary;

    public List<Questions> getAllQuestion() {
        return questionRepositary.findAll();

    }

    public ResponseEntity<String> addQuestions(Questions questions) {
        questionRepositary.save(questions);
        return new ResponseEntity<>("Success", HttpStatus.OK);
    }

    public ResponseEntity<String> updateQuestion(Integer id, Questions questions) {
        Questions questions1 =questionRepositary.findById(id).orElseThrow();
        questions1.setQuestionTitle(questions.getQuestionTitle());
        questions1.setDifficultylevel(questions.getDifficultylevel());
        questions1.setOption1(questions.getOption1());
        questions1.setOption2(questions.getOption2());
        questions1.setOption3(questions.getOption3());
        questions1.setOption4(questions.getOption4());
        questions1.setRightAnswer(questions.getRightAnswer());
        questions1.setCategory(questions.getCategory());

        questionRepositary.save(questions1);
        return new ResponseEntity<>("updated",HttpStatus.OK);
    }

    public ResponseEntity<String> deletequestionById(Integer id) {
        if(questionRepositary.existsById(id)){
            questionRepositary.deleteById(id);
            return new ResponseEntity<>("Question deleted",HttpStatus.OK);
        }
        else{
            throw new IllegalArgumentException("Question not exixts:"+id);
        }

    }
}
