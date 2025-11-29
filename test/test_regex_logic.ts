
const testCases = [
    {
        name: 'Simple image',
        input: '![alt](image.png)',
        expectedPath: 'image.png'
    },
    {
        name: 'Two images',
        input: '![alt1](img1.png) ![alt2](img2.png)',
        expectedPaths: ['img1.png', 'img2.png']
    },
    {
        name: 'Image with parentheses',
        input: '![alt](image(1).png)',
        expectedPath: 'image(1).png'
    },
    {
        name: 'Image with spaces',
        input: '![alt](image with spaces.png)',
        expectedPath: 'image with spaces.png'
    },
    {
        name: 'Image with nested parentheses (1 level)',
        input: '![alt](folder/image(v1).png)',
        expectedPath: 'folder/image(v1).png'
    }
];

// Improved regex for one level of nesting
const imageRegex = /!\[(.*?)\]\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;

testCases.forEach(test => {
    console.log(`Testing: ${test.name}`);
    const matches = [];
    let match;
    imageRegex.lastIndex = 0; // Reset
    while ((match = imageRegex.exec(test.input)) !== null) {
        matches.push(match[2]);
    }

    if (test.expectedPaths) {
        const passed = JSON.stringify(matches) === JSON.stringify(test.expectedPaths);
        console.log(passed ? 'PASS' : `FAIL: Expected ${JSON.stringify(test.expectedPaths)}, got ${JSON.stringify(matches)}`);
    } else if (test.expectedPath) {
        const passed = matches.length === 1 && matches[0] === test.expectedPath;
        console.log(passed ? 'PASS' : `FAIL: Expected ['${test.expectedPath}'], got ${JSON.stringify(matches)}`);
    }
});
