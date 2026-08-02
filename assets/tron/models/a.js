const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
let readline, fs;

if (isNode) {
    readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    fs = require('fs');
}

function rotatePoint(point, angleDeg, center) {
    const angleRad = angleDeg * Math.PI / 180;
    const cx = center[0], cy = center[1], cz = center[2];
    const x = point[0], y = point[1], z = point[2];
    const dy = y - cy, dz = z - cz;
    const xNew = x;
    const yNew = dy * Math.cos(angleRad) - dz * Math.sin(angleRad) + cy;
    const zNew = dy * Math.sin(angleRad) + dz * Math.cos(angleRad) + cz;
    return [xNew, yNew, zNew];
}

function getBakedBox(origFrom, origTo, baseAngle, center) {
    const corners = [
        [origFrom[0], origFrom[1], origFrom[2]],
        [origFrom[0], origFrom[1], origTo[2]],
        [origFrom[0], origTo[1], origFrom[2]],
        [origFrom[0], origTo[1], origTo[2]],
        [origTo[0], origFrom[1], origFrom[2]],
        [origTo[0], origFrom[1], origTo[2]],
        [origTo[0], origTo[1], origFrom[2]],
        [origTo[0], origTo[1], origTo[2]],
    ];
    const rotatedCorners = corners.map(c => rotatePoint(c, baseAngle, center));
    const minX = Math.min(...rotatedCorners.map(c => c[0]));
    const minY = Math.min(...rotatedCorners.map(c => c[1]));
    const minZ = Math.min(...rotatedCorners.map(c => c[2]));
    const maxX = Math.max(...rotatedCorners.map(c => c[0]));
    const maxY = Math.max(...rotatedCorners.map(c => c[1]));
    const maxZ = Math.max(...rotatedCorners.map(c => c[2]));
    return [[minX, minY, minZ], [maxX, maxY, maxZ]];
}

function generateCircleModel(numSegments, radius = 1.588888888885, radialThickness = 1.0, height = 1.0, center = [8.0, 8.0, 8.0], texture = "item/stick") {
    if (!Number.isInteger(numSegments) || numSegments < 4) {
        throw new Error("Number of segments must be an integer >= 4.");
    }
    const numPerQuad = Math.floor(numSegments / 4);
    if (numSegments % 4 !== 0) {
        console.warn("Number of segments not divisible by 4; some quadrants may have extra segments.");
    }

    // Calculate segment length based on outer radius to avoid exterior gaps
    const outerRadius = radius + radialThickness / 2;
    let segSpan, l;
    if (numPerQuad === 1) {
        segSpan = 90.0;
        l = 2 * outerRadius * Math.sin((segSpan * Math.PI / 180) / 2);
    } else {
        const angleStep = 90.0 / (numPerQuad - 1);
        segSpan = angleStep;
        l = 2 * outerRadius * Math.sin((segSpan * Math.PI / 180) / 2);
    }

    // Original cuboid at theta=0 (long in z, positioned at positive y, radial in y)
    const origFrom = [center[0] - height / 2, center[1] + radius - radialThickness / 2, center[2] - l / 2];
    const origTo = [center[0] + height / 2, center[1] + radius + radialThickness / 2, center[2] + l / 2];

    const elements = [];

    for (let q = 0; q < 4; q++) {
        const baseAngle = q * 90.0;
        const [fromQ, toQ] = getBakedBox(origFrom, origTo, baseAngle, center);

        let relAngles = [];
        if (numPerQuad === 1) {
            relAngles = [0.0];
        } else {
            relAngles = Array.from(
                { length: numPerQuad },
                (_, i) => -45.0 + i * 90.0 / (numPerQuad - 1)
            ).map(angle => Math.max(-45.0, Math.min(45.0, parseFloat(angle.toFixed(8)))));
        }

        for (const rel of relAngles) {
            const element = {
                from: fromQ.map(x => parseFloat(x.toFixed(8))),
                to: toQ.map(x => parseFloat(x.toFixed(8))),
                rotation: { angle: rel, axis: "x", origin: center },
                faces: {
                    north: { uv: [0, 0, 16, 16], texture: "#layer0" },
                    east: { uv: [0, 0, 16, 16], texture: "#layer0" },
                    south: { uv: [0, 0, 16, 16], texture: "#layer0" },
                    west: { uv: [0, 0, 16, 16], texture: "#layer0" },
                    up: { uv: [0, 0, 16, 16], texture: "#layer0" },
                    down: { uv: [0, 0, 16, 16], texture: "#layer0" }
                }
            };
            elements.push(element);
        }
    }

    const model = {
        parent: "item/handheld",
        textures: {
            layer0: texture
        },
        elements: elements
    };
    return model;
}

// Save JSON to file based on environment
function saveToFile(jsonData, fileName = "test.json") {
    if (isNode) {
        fs.writeFileSync(fileName, JSON.stringify(jsonData, null, 4), 'utf8');
        console.log(`Model saved to ${fileName}`);
    } else {
        const blob = new Blob([JSON.stringify(jsonData, null, 4)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`Model downloaded as ${fileName}`);
    }
}

// Handle input based on environment
if (isNode) {
    readline.question("Enter the number of segments (multiple of 4 recommended, min 4): ", (input) => {
        try {
            const numSegments = parseInt(input) || 16;
            const modelJson = generateCircleModel(numSegments);
            saveToFile(modelJson);
            readline.close();
        } catch (error) {
            console.error(error.message);
            readline.close();
        }
    });
} else {
    try {
        const numSegments = parseInt(prompt("Enter the number of segments (multiple of 4 recommended, min 4): ") || "16");
        const modelJson = generateCircleModel(numSegments);
        saveToFile(modelJson);
    } catch (error) {
        console.error(error.message);
    }
}