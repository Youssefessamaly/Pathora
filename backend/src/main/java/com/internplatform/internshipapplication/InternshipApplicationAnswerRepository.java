package com.internplatform.internshipapplication;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InternshipApplicationAnswerRepository extends JpaRepository<InternshipApplicationAnswer, UUID> {

    List<InternshipApplicationAnswer> findAllByApplicationIdOrderByDisplayOrderSnapshotAsc(UUID applicationId);
}
