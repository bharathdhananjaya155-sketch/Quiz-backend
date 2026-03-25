package com.application.quizapp.repository;

import com.application.quizapp.entity.Questions;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepositary extends JpaRepository<Questions,Integer> {

    @Query(value = "Select * from Questions q where q.category=:category Order by RAND() LIMIT :numQ",nativeQuery = true)
    List<Questions> findRandomQuestion(String category, int numQ);
}
