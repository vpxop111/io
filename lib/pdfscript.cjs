const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { performance } = require('perf_hooks');

class FilmScriptAnalyzer {
    constructor(pdfPath, scriptName) {
        this.pdfPath = pdfPath;
        this.scriptName = scriptName;
        this.outputDir = path.join(__dirname, '..', 'analysis_outputs', `${scriptName}_outputs`);

        // Create output directory if it doesn't exist
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        // Initialize data structures
        this.scenes = [];
        this.dialogues = [];
        this.characters = new Set();
        this.movieCharacters = [];
        this.interactions = [];
    }

    async extractPdfText() {
        console.log(`📖 Extracting text from ${this.scriptName} PDF...`);
        const startTime = performance.now();
        
        try {
            if (!fs.existsSync(this.pdfPath)) {
                throw new Error(`PDF file not found: ${this.pdfPath}`);
            }

            const dataBuffer = fs.readFileSync(this.pdfPath);
            console.log(`📄 PDF file size: ${(dataBuffer.length / 1024).toFixed(2)} KB`);
            
            const data = await pdf(dataBuffer, {
                // PDF parsing options
                max: 0, // No page limit
                version: 'v1.10.100'
            });
            
            const extractTime = performance.now() - startTime;
            console.log(`✅ Text extracted successfully (${extractTime.toFixed(2)}ms)`);
            console.log(`📝 Extracted ${data.text.length} characters from ${data.numpages} pages`);
            
            return data.text;
        } catch (error) {
            console.error(`❌ Error extracting PDF: ${error.message}`);
            throw new Error(`Failed to extract PDF text: ${error.message}`);
        }
    }

    parseScreenplay(text) {
        console.log(`🎬 Parsing ${this.scriptName} screenplay structure...`);
        const startTime = performance.now();

        const lines = text.split('\n');
        let currentScene = null;
        let currentSceneAction = "";
        let currentSceneCharacters = [];
        let currentSceneDialogues = [];
        let sceneNumber = 0;

        console.log(`📄 Processing ${lines.length} lines of text...`);

        for (let i = 0; i < lines.length; i++) {
            const trimmedLine = lines[i].trim();
            if (!trimmedLine) continue;

            // Enhanced scene detection pattern
            const sceneMatch = trimmedLine.match(/^(?:\d+\s+)?(INT\.|EXT\.|INTERIOR|EXTERIOR)\s+(.+)/i);
            if (sceneMatch) {
                // Save previous scene if exists
                if (currentScene) {
                    sceneNumber++;
                    this.scenes.push({
                        sceneNumber: sceneNumber,
                        Scene_Names: currentScene,
                        Scene_action: currentSceneAction.trim(),
                        Scene_Characters: currentSceneCharacters.length > 0 ? [...currentSceneCharacters] : null,
                        Scene_Dialogue: currentSceneDialogues.length > 0 ? [...currentSceneDialogues] : null,
                        Contents: `${currentSceneAction.trim()}\n${currentSceneDialogues.join(' ')}`,
                        location: this.extractLocation(currentScene),
                        timeOfDay: this.extractTimeOfDay(currentScene)
                    });
                }

                // Start new scene
                currentScene = trimmedLine;
                currentSceneAction = "";
                currentSceneCharacters = [];
                currentSceneDialogues = [];
                
            } else if (trimmedLine.includes(':') && trimmedLine.length < 200) {
                // Enhanced character dialogue detection
                const charMatch = trimmedLine.match(/^([A-Z][A-Z\s'().-]{1,49}):\s*(.*)/);
                if (charMatch) {
                    let character = charMatch[1].trim().replace(/\s*\(.*?\)/, '').replace(/\s+/g, ' ').trim();
                    const dialogue = charMatch[2].trim();
                    
                    // Filter out obvious non-character patterns
                    const invalidPatterns = /^(INT|EXT|FADE|CUT|INTERIOR|EXTERIOR|SCENE|THE|AND|OR|TO|IN|ON|AT|TIME|PLACE|LOCATION|CONT|CONTINUED|MORE)$/i;
                    
                    if (character && character.length > 1 && character.length < 50 && !invalidPatterns.test(character)) {
                        this.characters.add(character);
                        if (!currentSceneCharacters.includes(character)) {
                            currentSceneCharacters.push(character);
                        }
                        if (dialogue) {
                            currentSceneDialogues.push(dialogue);
                            this.dialogues.push({
                                sceneNumber: sceneNumber + 1,
                                characters: character,
                                Character_dialogue: dialogue,
                                lineNumber: i + 1
                            });
                        }
                    }
                }
            } else if (/^[A-Z'\s]+$/.test(trimmedLine) && trimmedLine.length > 2 && trimmedLine.length < 30) {
                // Character name on its own line
                let character = trimmedLine.trim().replace(/\s*\(.*?\)/, '');
                const commonWords = ['THE', 'AND', 'OR', 'TO', 'IN', 'ON', 'AT', 'FADE', 'CUT', 'INT', 'EXT'];
                
                if (character && !commonWords.includes(character)) {
                    this.characters.add(character);
                    if (!currentSceneCharacters.includes(character)) {
                        currentSceneCharacters.push(character);
                    }
                }
            } else if (/^[A-Z][A-Z\s'().]+$/.test(trimmedLine) && trimmedLine.length < 50) {
                // Additional character detection
                let character = trimmedLine.trim().replace(/\s*\(.*?\)/, '');
                if (character && character.length > 1) {
                    this.characters.add(character);
                    if (!currentSceneCharacters.includes(character)) {
                        currentSceneCharacters.push(character);
                    }
                }
            } else {
                // Scene action/description
                currentSceneAction += " " + trimmedLine;
            }
        }

        // Save the last scene
        if (currentScene) {
            sceneNumber++;
            this.scenes.push({
                sceneNumber: sceneNumber,
                Scene_Names: currentScene,
                Scene_action: currentSceneAction.trim(),
                Scene_Characters: currentSceneCharacters.length > 0 ? [...currentSceneCharacters] : null,
                Scene_Dialogue: currentSceneDialogues.length > 0 ? [...currentSceneDialogues] : null,
                Contents: `${currentSceneAction.trim()}\n${currentSceneDialogues.join(' ')}`,
                location: this.extractLocation(currentScene),
                timeOfDay: this.extractTimeOfDay(currentScene)
            });
        }

        // Process characters
        this.movieCharacters = Array.from(this.characters)
            .filter(char => char.length > 1 && char.length < 50)
            .sort();

        // Analyze character interactions
        this.analyzeCharacterInteractions();

        const parseTime = performance.now() - startTime;
        console.log(`✅ Parsing completed (${parseTime.toFixed(2)}ms)`);
        console.log(`📊 Found ${this.scenes.length} scenes, ${this.movieCharacters.length} characters, ${this.dialogues.length} dialogues`);
    }

    extractLocation(sceneHeader) {
        const match = sceneHeader.match(/^(?:INT\.|EXT\.|INTERIOR|EXTERIOR)\s+(.+?)(?:\s+-\s+|\s+–\s+|$)/i);
        return match ? match[1].trim() : '';
    }

    extractTimeOfDay(sceneHeader) {
        const timeMatch = sceneHeader.match(/\b(DAY|NIGHT|MORNING|AFTERNOON|EVENING|DAWN|DUSK|CONTINUOUS|LATER|SAME TIME)\b/i);
        return timeMatch ? timeMatch[1].toUpperCase() : 'UNSPECIFIED';
    }

    analyzeCharacterInteractions() {
        console.log(`🤝 Analyzing character interactions...`);
        const interactions = new Map();

        // Group dialogues by scene
        const sceneDialogues = new Map();
        this.dialogues.forEach(dialogue => {
            const sceneNum = dialogue.sceneNumber;
            if (!sceneDialogues.has(sceneNum)) {
                sceneDialogues.set(sceneNum, []);
            }
            sceneDialogues.get(sceneNum).push(dialogue);
        });

        // Analyze interactions within each scene
        sceneDialogues.forEach((dialogues, sceneNum) => {
            const sceneCharacters = [...new Set(dialogues.map(d => d.characters))];
            
            // Create interactions between characters in the same scene
            for (let i = 0; i < sceneCharacters.length; i++) {
                for (let j = i + 1; j < sceneCharacters.length; j++) {
                    const char1 = sceneCharacters[i];
                    const char2 = sceneCharacters[j];
                    const interactionKey = [char1, char2].sort().join('|');
                    
                    if (!interactions.has(interactionKey)) {
                        interactions.set(interactionKey, {
                            character1: char1,
                            character2: char2,
                            scenes: [],
                            interactionCount: 0
                        });
                    }
                    
                    const interaction = interactions.get(interactionKey);
                    interaction.scenes.push(sceneNum);
                    interaction.interactionCount++;
                }
            }
        });

        this.interactions = Array.from(interactions.values());
        console.log(`🤝 Found ${this.interactions.length} character interactions`);
    }

    generateSummary() {
        return {
            scriptName: this.scriptName,
            totalScenes: this.scenes.length,
            totalCharacters: this.movieCharacters.length,
            totalDialogues: this.dialogues.length,
            totalInteractions: this.interactions.length,
            analysisTimestamp: new Date().toISOString(),
            averageDialoguesPerScene: this.scenes.length > 0 ? Math.round(this.dialogues.length / this.scenes.length * 100) / 100 : 0,
            charactersPerScene: this.scenes.length > 0 ? Math.round(this.scenes.reduce((sum, scene) => sum + (scene.Scene_Characters?.length || 0), 0) / this.scenes.length * 100) / 100 : 0
        };
    }

    saveAllScenes() {
        console.log(`💾 Saving ALL ${this.scriptName} scenes...`);
        const filePath = path.join(this.outputDir, 'ALL_SCENES_COMPLETE.txt');
        let content = `${this.scriptName.toUpperCase()} - ALL SCENES COMPLETE\n`;
        content += `Complete extraction of all ${this.scenes.length} scenes\n`;
        content += `Analysis timestamp: ${new Date().toISOString()}\n`;
        content += "=".repeat(80) + "\n\n";

        this.scenes.forEach((scene, idx) => {
            content += `SCENE ${scene.sceneNumber || idx + 1}:\n`;
            content += "-".repeat(40) + "\n";
            content += `Scene Name: ${scene.Scene_Names}\n`;
            content += `Location: ${scene.location}\n`;
            content += `Time of Day: ${scene.timeOfDay}\n`;
            content += `Scene Action: ${scene.Scene_action}\n`;
            content += `Characters: ${scene.Scene_Characters ? scene.Scene_Characters.join(', ') : 'None'}\n`;
            content += `Dialogues: ${scene.Scene_Dialogue ? scene.Scene_Dialogue.join(' | ') : 'None'}\n`;
            content += `Complete Content: ${scene.Contents}\n`;
            content += "=".repeat(80) + "\n\n";
        });

        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ ALL ${this.scenes.length} scenes saved to ${filePath}`);
    }

    saveAllDialogues() {
        console.log(`💾 Saving ALL ${this.scriptName} dialogues...`);
        const filePath = path.join(this.outputDir, 'ALL_DIALOGUES_COMPLETE.txt');
        let content = `${this.scriptName.toUpperCase()} - ALL DIALOGUES COMPLETE\n`;
        content += `Complete extraction of all ${this.dialogues.length} dialogue entries\n`;
        content += `Analysis timestamp: ${new Date().toISOString()}\n`;
        content += "=".repeat(80) + "\n\n";

        this.dialogues.forEach((dialogue, idx) => {
            content += `DIALOGUE ${idx + 1}:\n`;
            content += "-".repeat(30) + "\n";
            content += `Scene: ${dialogue.sceneNumber}\n`;
            content += `Character: ${dialogue.characters}\n`;
            content += `Line: ${dialogue.Character_dialogue}\n`;
            content += `Source Line: ${dialogue.lineNumber}\n`;
            content += "=".repeat(80) + "\n\n";
        });

        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ ALL ${this.dialogues.length} dialogues saved to ${filePath}`);
    }

    saveAllCharacters() {
        console.log(`💾 Saving ALL ${this.scriptName} characters...`);
        const filePath = path.join(this.outputDir, 'ALL_CHARACTERS_COMPLETE.txt');
        let content = `${this.scriptName.toUpperCase()} - ALL CHARACTERS COMPLETE\n`;
        content += `Complete list of all ${this.movieCharacters.length} characters\n`;
        content += `Analysis timestamp: ${new Date().toISOString()}\n`;
        content += "=".repeat(80) + "\n\n";

        this.movieCharacters.forEach((character, idx) => {
            const characterDialogues = this.dialogues.filter(d => d.characters === character);
            const characterScenes = [...new Set(characterDialogues.map(d => d.sceneNumber))];
            
            content += `CHARACTER ${idx + 1}: ${character}\n`;
            content += "-".repeat(30) + "\n";
            content += `Total Dialogues: ${characterDialogues.length}\n`;
            content += `Appears in Scenes: ${characterScenes.join(', ')}\n`;
            content += `Scene Count: ${characterScenes.length}\n`;
            content += "=".repeat(80) + "\n\n";
        });

        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ ALL ${this.movieCharacters.length} characters saved to ${filePath}`);
    }

    saveInteractions() {
        console.log(`💾 Saving character interactions...`);
        const filePath = path.join(this.outputDir, 'CHARACTER_INTERACTIONS.txt');
        let content = `${this.scriptName.toUpperCase()} - CHARACTER INTERACTIONS\n`;
        content += `Analysis of ${this.interactions.length} character interactions\n`;
        content += `Analysis timestamp: ${new Date().toISOString()}\n`;
        content += "=".repeat(80) + "\n\n";

        this.interactions.forEach((interaction, idx) => {
            content += `INTERACTION ${idx + 1}:\n`;
            content += "-".repeat(30) + "\n";
            content += `Characters: ${interaction.character1} & ${interaction.character2}\n`;
            content += `Scenes Together: ${interaction.scenes.join(', ')}\n`;
            content += `Interaction Count: ${interaction.interactionCount}\n`;
            content += "=".repeat(80) + "\n\n";
        });

        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ Character interactions saved to ${filePath}`);
    }

    async runCompleteAnalysis() {
        console.log(`🚀 Starting complete analysis for ${this.scriptName}...`);
        const startTime = performance.now();

        try {
            // Step 1: Extract PDF text
            const text = await this.extractPdfText();
            if (!text || text.length === 0) {
                throw new Error('No text could be extracted from the PDF');
            }

            // Step 2: Parse screenplay structure
            this.parseScreenplay(text);

            // Step 3: Save all analysis files
            this.saveAllScenes();
            this.saveAllDialogues();
            this.saveAllCharacters();
            this.saveInteractions();

            // Step 4: Generate final summary
            const summary = this.generateSummary();
            
            const totalTime = performance.now() - startTime;
            console.log(`✅ Complete analysis finished in ${totalTime.toFixed(2)}ms`);

            return {
                totalScenes: this.scenes.length,
                totalCharacters: this.movieCharacters.length,
                totalDialogues: this.dialogues.length,
                scenes: this.scenes,
                characters: this.movieCharacters,
                dialogues: this.dialogues,
                interactions: this.interactions,
                summary: {
                    ...summary,
                    processingTimeMs: Math.round(totalTime),
                    averageSceneLength: this.scenes.length > 0 ? Math.round(this.scenes.reduce((sum, scene) => sum + (scene.Contents?.length || 0), 0) / this.scenes.length) : 0
                }
            };

        } catch (error) {
            console.error(`❌ Analysis failed: ${error.message}`);
            throw error;
        }
    }
}

module.exports = { FilmScriptAnalyzer };