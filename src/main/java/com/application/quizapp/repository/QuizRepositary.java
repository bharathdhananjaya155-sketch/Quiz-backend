package com.application.quizapp.repository;

import com.application.quizapp.entity.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizRepositary extends JpaRepository<Quiz, Integer> {

}
