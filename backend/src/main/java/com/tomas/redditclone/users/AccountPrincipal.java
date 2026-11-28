package com.tomas.redditclone.users;

import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.User;

// User erases its password after authentication; only the public profile remains.
public class AccountPrincipal extends User {

    private final UserResponse profile;

    public AccountPrincipal(UserResponse profile, String passwordHash) {
        super(profile.username(), passwordHash, AuthorityUtils.createAuthorityList("ROLE_USER"));
        this.profile = profile;
    }

    public UserResponse profile() {
        return profile;
    }
}
