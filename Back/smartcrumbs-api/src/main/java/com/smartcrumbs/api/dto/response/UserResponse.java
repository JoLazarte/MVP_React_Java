package com.smartcrumbs.api.dto.response;

import com.smartcrumbs.api.enums.Role;

public record UserResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        Role role,
        Boolean enabled
) {
}