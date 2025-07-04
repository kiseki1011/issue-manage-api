package com.tissue.api.member.presentation.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.tissue.api.member.domain.model.Member;
import com.tissue.api.member.domain.model.enums.JobType;

import lombok.Builder;

@Builder
public record MemberDetail(
	String loginId,
	String email,

	String name,
	LocalDate birthDate,
	JobType jobType,

	int ownedWorkspaceCount,

	LocalDateTime createdAt,
	LocalDateTime updatedAt
) {
	public static MemberDetail from(Member member) {
		return MemberDetail.builder()
			.loginId(member.getLoginId())
			.email(member.getEmail())
			.name(member.getName())
			.birthDate(member.getBirthDate())
			.jobType(member.getJobType())
			.ownedWorkspaceCount(member.getMyWorkspaceCount())
			.createdAt(member.getCreatedDate())
			.updatedAt(member.getLastModifiedDate())
			.build();
	}
}
