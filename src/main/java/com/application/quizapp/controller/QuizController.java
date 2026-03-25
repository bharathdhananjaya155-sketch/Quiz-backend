package com.application.quizapp.controller;


import com.application.quizapp.entity.QuestionsWrapper;
import com.application.quizapp.entity.Response;
import com.application.quizapp.service.QuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/quiz")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    @PostMapping("/create")
    public ResponseEntity<String> creatQuiz(@RequestParam String category, @RequestParam int numQ,@RequestParam String title){
        return quizService.createQuiz(category,numQ,title);
    }


    @GetMapping("/get/{id}")
    public ResponseEntity<List<QuestionsWrapper>> getQuiz(@PathVariable Integer id){
        return quizService.getQuiz(id);
    }

    @PostMapping("/submit/{id}")
    public ResponseEntity<Integer> submitQuiz(@PathVariable Integer id,@RequestBody List<Response> responses){
        return quizService.calculateresult(id,responses);
    }


}
