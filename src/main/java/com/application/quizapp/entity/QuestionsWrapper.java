package com.application.quizapp.entity;

import lombok.Data;
import lombok.RequiredArgsConstructor;

@Data
@RequiredArgsConstructor

public class QuestionsWrapper {

    private final Integer id;
    private final String questionTitle;
    private final String option1;
    private final String option2;
    private final String option3;
    private final String option4;

}
