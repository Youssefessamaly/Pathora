package com.internplatform.internshipapplication;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * An immutable snapshot of one answered question at the moment an application was submitted.
 * Deliberately duplicates the question's text/type/required/order rather than joining to the
 * live InternshipApplicationQuestion row, so an application's history can never change if the
 * question is later edited — in practice questions freeze once any application exists, but the
 * snapshot is what makes that guarantee independent of that freeze rule ever being bypassed.
 */
@Entity
@Table(name = "internship_application_answers")
public class InternshipApplicationAnswer {

    @Id
    private UUID id;

    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "question_text_snapshot", nullable = false, length = 500)
    private String questionTextSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type_snapshot", nullable = false, length = 20)
    private ApplicationQuestionType questionTypeSnapshot;

    @Column(name = "required_snapshot", nullable = false)
    private boolean requiredSnapshot;

    @Column(name = "display_order_snapshot", nullable = false)
    private int displayOrderSnapshot;

    @Column(name = "answer_text", nullable = false)
    private String answerText;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected InternshipApplicationAnswer() {
    }

    public InternshipApplicationAnswer(UUID applicationId, UUID questionId) {
        this.applicationId = applicationId;
        this.questionId = questionId;
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() {
        return id;
    }

    public UUID getApplicationId() {
        return applicationId;
    }

    public UUID getQuestionId() {
        return questionId;
    }

    public String getQuestionTextSnapshot() {
        return questionTextSnapshot;
    }

    public void setQuestionTextSnapshot(String questionTextSnapshot) {
        this.questionTextSnapshot = questionTextSnapshot;
    }

    public ApplicationQuestionType getQuestionTypeSnapshot() {
        return questionTypeSnapshot;
    }

    public void setQuestionTypeSnapshot(ApplicationQuestionType questionTypeSnapshot) {
        this.questionTypeSnapshot = questionTypeSnapshot;
    }

    public boolean isRequiredSnapshot() {
        return requiredSnapshot;
    }

    public void setRequiredSnapshot(boolean requiredSnapshot) {
        this.requiredSnapshot = requiredSnapshot;
    }

    public int getDisplayOrderSnapshot() {
        return displayOrderSnapshot;
    }

    public void setDisplayOrderSnapshot(int displayOrderSnapshot) {
        this.displayOrderSnapshot = displayOrderSnapshot;
    }

    public String getAnswerText() {
        return answerText;
    }

    public void setAnswerText(String answerText) {
        this.answerText = answerText;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
