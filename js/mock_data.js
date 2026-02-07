const MOCK_DATA = {
    problems: [
        {
            problemId: "p-001",
            workbookId: "2023-1",
            workbookTitle: "2023년 1회 공조냉동기계산업기사",
            subject: "공기조화",
            question: "다음 중 습공기선도에서 나타낼 수 없는 것은?",
            imageUrl: "",
            choices: ["건구온도", "습구온도", "엔탈피", "열전도율"],
            answer: 4,
            explanation: "열전도율은 습공기선도에 나타나지 않는 물성치입니다.",
            creatorId: "admin"
        },
        {
            problemId: "p-002",
            workbookId: "2023-1",
            workbookTitle: "2023년 1회 공조냉동기계산업기사",
            subject: "냉동공학",
            question: "냉동사이클에서 응축기의 역할로 가장 옳은 것은?",
            imageUrl: "",
            choices: ["고압 기체를 고압 액체로 만든다.", "저압 액체를 저압 기체로 만든다.", "고압 액체를 저압 액체로 만든다.", "저압 기체를 고압 기체로 만든다."],
            answer: 1,
            explanation: "응축기는 압축기에서 나온 고온고압의 기체 냉매를 냉각시켜 고온고압의 액체로 응축시키는 역할을 합니다.",
            creatorId: "admin"
        },
        {
            problemId: "p-003",
            workbookId: "2023-1",
            workbookTitle: "2023년 1회 공조냉동기계산업기사",
            subject: "배관일반",
            question: "강관의 스케줄 번호(Sch. No)는 무엇을 나타내는가?",
            imageUrl: "",
            choices: ["관의 내경", "관의 외경", "관의 두께", "관의 길이"],
            answer: 3,
            explanation: "스케줄 번호는 관의 두께를 나타내는 지표입니다.",
            creatorId: "admin"
        }
    ],
    user: {
        id: "test-user",
        name: "수험생",
        settings: {
            dDay: "2026-12-31"
        }
    },
    records: []
};
