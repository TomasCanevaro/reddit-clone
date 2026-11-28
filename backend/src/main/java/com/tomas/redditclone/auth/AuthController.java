package com.tomas.redditclone.auth;

import com.tomas.redditclone.users.AccountPrincipal;
import com.tomas.redditclone.users.UserResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getHeaderName(), token.getToken());
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AccountPrincipal account) {
        return account.profile();
    }

    public record CsrfResponse(String headerName, String token) {
    }
}
