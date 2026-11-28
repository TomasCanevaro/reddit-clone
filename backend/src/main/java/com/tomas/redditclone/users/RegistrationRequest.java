package com.tomas.redditclone.users;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegistrationRequest(
        @NotBlank(message = "Username is required.")
        @Pattern(regexp = "[A-Za-z0-9_-]{3,20}",
                message = "Username must be 3–20 letters, numbers, underscores, or hyphens.")
        String username,
        @NotBlank(message = "Password is required.")
        @Size(min = 12, max = 128, message = "Password must be 12–128 characters.")
        String password) {

    @Override
    public String toString() {
        return "RegistrationRequest[username=" + username + ", password=[REDACTED]]";
    }
}
