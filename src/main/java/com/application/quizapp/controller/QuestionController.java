package com.application.quizapp.controller;


import com.application.quizapp.entity.Questions;
import com.application.quizapp.service.QuestionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController

@RequestMapping("/question")
public class QuestionController {

    @Autowired
    QuestionService questionService;

    @GetMapping("/allQuestion")
    public List<Questions> getAllQuestion(){
        return questionService.getAllQuestion();
    }

    @PostMapping("/add")
    public ResponseEntity<String> addQuestion(@RequestBody Questions questions) {
        return questionService.addQuestions(questions);
    }


    @PutMapping("/upadate/{id}")
    public ResponseEntity<String> updateQuestion(@PathVariable Integer id,@RequestBody Questions questions){
        return questionService.updateQuestion(id,questions);
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> deleteQuestionById(@PathVariable Integer id){
        return questionService.deletequestionById(id);
    }

}
