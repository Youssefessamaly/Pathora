package com.internplatform.internprofile;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Extracts text from uploaded CV PDFs and detects which Pathora catalog skills appear in
 * that text — entirely locally (Apache PDFBox), with no cloud APIs, OCR, or AI/embeddings.
 * Detection is a deterministic, word-boundary-aware substring match against the existing
 * Skill catalog; it never introduces a second, independent skill list.
 */
@Service
public class CvSkillExtractionService {

    /**
     * Loads the PDF and strips its text. A PDF that fails to parse at all (corrupt,
     * truncated, password-protected, or otherwise not a well-formed PDF document) is
     * rejected with a clear 400 rather than silently treated as "no skills found" — this
     * mirrors the existing signature-check failure mode in InternProfileService, so an
     * upload either fully succeeds (CV stored, skills detected) or fully fails (nothing
     * changed). A structurally valid PDF that simply has no extractable text (e.g. a
     * scanned image with no text layer — OCR is explicitly out of scope) is NOT a failure:
     * it legitimately yields empty text, which in turn detects zero skills.
     */
    public String extractText(byte[] pdfBytes) {
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            return new PDFTextStripper().getText(document);
        } catch (IOException | RuntimeException exception) {
            // PDFBox can throw various runtime exceptions (e.g. for malformed cross-reference
            // tables) in addition to IOException depending on how the file is broken —
            // all of them mean the same thing here: this isn't a text-readable PDF.
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "CV must be a valid, text-readable PDF file"
            );
        }
    }

    /**
     * Matches catalog skill names against already-extracted text. Pure and
     * Spring/PDF-independent on purpose, so the tricky matching rules (case-insensitivity,
     * whitespace normalization, Java-vs-JavaScript style boundary safety, multi-word names)
     * can be unit-tested directly against plain strings without needing real PDF files.
     */
    public Set<Skill> detectSkills(String extractedText, Collection<Skill> catalog) {
        String normalized = normalize(extractedText);
        Set<Skill> detected = new HashSet<>();

        for (Skill skill : catalog) {
            if (buildSkillPattern(skill.getName()).matcher(normalized).find()) {
                detected.add(skill);
            }
        }

        return detected;
    }

    private String normalize(String text) {
        return text == null ? "" : text.replaceAll("\\s+", " ");
    }

    /**
     * Builds a case-insensitive, word-boundary-anchored pattern for a (possibly multi-word)
     * skill name. `\b` boundaries are what prevent "Java" from matching inside "JavaScript":
     * every character in "JavaScript" is a word character, so there is no boundary between
     * "Java" and "Script" for `\bJava\b` to land on — it only matches "Java" as an
     * independent token. `\s+` between words tolerates line-wrapped multi-word skills like
     * "Spring Boot" even though normalize() already collapsed whitespace to single spaces.
     */
    private Pattern buildSkillPattern(String skillName) {
        String joined = Arrays.stream(skillName.trim().split("\\s+"))
                .map(Pattern::quote)
                .collect(Collectors.joining("\\s+"));

        return Pattern.compile("\\b" + joined + "\\b", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    }
}
