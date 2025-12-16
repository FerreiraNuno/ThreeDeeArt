import * as THREE from 'three';

/**
 * Person/Character creation and management module
 */
export class PersonManager {
    constructor(scene) {
        this.scene = scene;
        this.persons = {};
    }

    /**
     * Create a humanoid player prop with realistic proportions
     * @param {THREE.Vector3} position - Position to place the person
     * @param {Object} options - Customization options for the person
     * @returns {THREE.Group} The person group object
     */
    createPerson(position = new THREE.Vector3(0, 0, 0), options = {}) {
        const config = {
            skinColor: options.skinColor || 0xfdbcb4,
            clothingColor: options.clothingColor || 0x4169e1,
            pantsColor: options.pantsColor || 0x2f4f4f,
            shoeColor: options.shoeColor || 0x000000,
            hairColor: options.hairColor || 0x8b4513,
            scale: options.scale || 1,
            name: options.name || 'person_' + Date.now()
        };

        const personGroup = new THREE.Group();
        personGroup.name = config.name;
        
        // Materials for different body parts
        const skinMaterial = new THREE.MeshLambertMaterial({ color: config.skinColor });
        const clothingMaterial = new THREE.MeshLambertMaterial({ color: config.clothingColor });
        const pantsMaterial = new THREE.MeshLambertMaterial({ color: config.pantsColor });
        const shoeMaterial = new THREE.MeshLambertMaterial({ color: config.shoeColor });
        const hairMaterial = new THREE.MeshLambertMaterial({ color: config.hairColor });

        // Create body parts and store references for animation
        personGroup.bodyParts = {};
        personGroup.bodyParts.head = this.createHead(personGroup, skinMaterial, config.scale);
        personGroup.bodyParts.hair = this.createHair(personGroup, hairMaterial, config.scale);
        personGroup.bodyParts.eyes = this.createEyes(personGroup, config.scale);
        personGroup.bodyParts.torso = this.createTorso(personGroup, clothingMaterial, config.scale);
        personGroup.bodyParts.arms = this.createArms(personGroup, clothingMaterial, skinMaterial, config.scale);
        personGroup.bodyParts.legs = this.createLegs(personGroup, pantsMaterial, config.scale);
        
        // Create feet and attach them to legs
        personGroup.bodyParts.feet = this.createFeet(personGroup.bodyParts.legs, shoeMaterial, config.scale);

        // Animation state
        personGroup.animationState = {
            isWalking: false,
            isJumping: false,
            walkCycle: 0,
            jumpProgress: 0,
            lastPosition: personGroup.position.clone(),
            velocity: new THREE.Vector3()
        };

        // Position the entire person
        personGroup.position.copy(position);
        
        // Add bounding box for collision detection
        personGroup.BBox = new THREE.Box3().setFromObject(personGroup);
        
        // Add bounding box helper (can be removed later)
        const bboxHelper = new THREE.Box3Helper(personGroup.BBox, 0x00ff00);
        personGroup.bboxHelper = bboxHelper; // Store helper reference for updates
        this.scene.add(bboxHelper);

        // Store the person
        this.persons[config.name] = personGroup;
        this.scene.add(personGroup);
        
        console.log(`Person created: ${config.name}, children count: ${personGroup.children.length}`);
        
        return personGroup;
    }

    /**
     * Create the head of the person
     */
    createHead(personGroup, skinMaterial, scale) {
        const headGeometry = new THREE.SphereGeometry(0.15 * scale, 16, 16);
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.set(0, 1.65 * scale, 0);
        head.castShadow = true;
        head.receiveShadow = true;
        personGroup.add(head);
        return head;
    }

    /**
     * Create the eyes of the person
     */
    createEyes(personGroup, scale) {
        const eyeWhiteMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff }); // White eye base
        const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 }); // Black pupil
        
        const eyeGeometry = new THREE.SphereGeometry(0.03 * scale, 8, 8); // Eye base
        const pupilGeometry = new THREE.SphereGeometry(0.015 * scale, 6, 6); // Pupil
        
        // Left eye (from person's perspective) - positioned lower on face
        const leftEye = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
        leftEye.position.set(-0.04 * scale, 1.62 * scale, 0.14 * scale); // Lower Y position
        leftEye.castShadow = true;
        leftEye.receiveShadow = true;
        personGroup.add(leftEye);
        
        // Left pupil
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.04 * scale, 1.62 * scale, 0.155 * scale); // Lower Y position
        leftPupil.castShadow = true;
        personGroup.add(leftPupil);

        // Right eye (from person's perspective) - positioned lower on face
        const rightEye = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
        rightEye.position.set(0.04 * scale, 1.62 * scale, 0.14 * scale); // Lower Y position
        rightEye.castShadow = true;
        rightEye.receiveShadow = true;
        personGroup.add(rightEye);
        
        // Right pupil
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.04 * scale, 1.62 * scale, 0.155 * scale); // Lower Y position
        rightPupil.castShadow = true;
        personGroup.add(rightPupil);

        console.log('Eyes with pupils created for person'); // Debug log

        return { leftEye, rightEye, leftPupil, rightPupil };
    }

    /**
     * Create the hair of the person
     */
    createHair(personGroup, hairMaterial, scale) {
        const hairGeometry = new THREE.SphereGeometry(0.16 * scale, 16, 16);
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.set(0, 1.7 * scale, 0);
        hair.scale.set(1, 0.6, 1);
        hair.castShadow = true;
        personGroup.add(hair);
        return hair;
    }

    /**
     * Create the torso of the person
     */
    createTorso(personGroup, clothingMaterial, scale) {
        const torsoGeometry = new THREE.CylinderGeometry(0.12 * scale, 0.15 * scale, 0.6 * scale, 12);
        const torso = new THREE.Mesh(torsoGeometry, clothingMaterial);
        torso.position.set(0, 1.2 * scale, 0);
        torso.castShadow = true;
        torso.receiveShadow = true;
        personGroup.add(torso);
        return torso;
    }

    /**
     * Create the arms and hands of the person
     */
    createArms(personGroup, clothingMaterial, skinMaterial, scale) {
        const armGeometry = new THREE.CylinderGeometry(0.04 * scale, 0.05 * scale, 0.5 * scale, 8);
        const handGeometry = new THREE.SphereGeometry(0.04 * scale, 8, 8);
        
        // Left arm
        const leftArm = new THREE.Mesh(armGeometry, clothingMaterial);
        leftArm.position.set(-0.2 * scale, 1.25 * scale, 0);
        leftArm.rotation.z = 0.2;
        leftArm.castShadow = true;
        leftArm.receiveShadow = true;
        personGroup.add(leftArm);

        // Right arm
        const rightArm = new THREE.Mesh(armGeometry, clothingMaterial);
        rightArm.position.set(0.2 * scale, 1.25 * scale, 0);
        rightArm.rotation.z = -0.2;
        rightArm.castShadow = true;
        rightArm.receiveShadow = true;
        personGroup.add(rightArm);

        // Left hand
        const leftHand = new THREE.Mesh(handGeometry, skinMaterial);
        leftHand.position.set(-0.25 * scale, 0.95 * scale, 0);
        leftHand.castShadow = true;
        leftHand.receiveShadow = true;
        personGroup.add(leftHand);

        // Right hand
        const rightHand = new THREE.Mesh(handGeometry, skinMaterial);
        rightHand.position.set(0.25 * scale, 0.95 * scale, 0);
        rightHand.castShadow = true;
        rightHand.receiveShadow = true;
        personGroup.add(rightHand);

        return { leftArm, rightArm, leftHand, rightHand };
    }

    /**
     * Create the legs of the person
     */
    createLegs(personGroup, pantsMaterial, scale) {
        const legLength = 0.7 * scale;
        const legGeometry = new THREE.CylinderGeometry(0.06 * scale, 0.07 * scale, legLength, 8);
        
        // Create leg containers for proper pivot points
        const leftLegContainer = new THREE.Group();
        const rightLegContainer = new THREE.Group();
        
        // Position containers at the base of torso (hip level)
        const hipHeight = 0.9 * scale; // Base of torso
        leftLegContainer.position.set(-0.08 * scale, hipHeight, 0);
        rightLegContainer.position.set(0.08 * scale, hipHeight, 0);
        
        // Create leg meshes
        const leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        const rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        
        // Position legs so they hang down from the hip (pivot at top)
        leftLeg.position.set(0, -legLength / 2, 0);
        rightLeg.position.set(0, -legLength / 2, 0);
        
        leftLeg.castShadow = true;
        leftLeg.receiveShadow = true;
        rightLeg.castShadow = true;
        rightLeg.receiveShadow = true;
        
        // Add legs to their containers
        leftLegContainer.add(leftLeg);
        rightLegContainer.add(rightLeg);
        
        // Add containers to person group
        personGroup.add(leftLegContainer);
        personGroup.add(rightLegContainer);

        return { 
            leftLeg: leftLegContainer,  // Return containers for animation
            rightLeg: rightLegContainer,
            leftLegMesh: leftLeg,       // Keep mesh references if needed
            rightLegMesh: rightLeg
        };
    }

    /**
     * Create the feet/shoes of the person and attach them to legs
     */
    createFeet(legContainers, shoeMaterial, scale) {
        const shoeGeometry = new THREE.BoxGeometry(0.12 * scale, 0.06 * scale, 0.2 * scale);
        
        // Calculate foot position relative to leg container (at bottom of leg)
        const legLength = 0.7 * scale;
        const footOffsetY = -legLength + 0.03 * scale; // At bottom of leg (legs hang down from hip)
        
        // Left shoe - attach to left leg container
        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(0, footOffsetY, 0.05 * scale); // Relative to leg container
        leftShoe.castShadow = true;
        leftShoe.receiveShadow = true;
        legContainers.leftLeg.add(leftShoe); // Attach to left leg container

        // Right shoe - attach to right leg container
        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(0, footOffsetY, 0.05 * scale); // Relative to leg container
        rightShoe.castShadow = true;
        rightShoe.receiveShadow = true;
        legContainers.rightLeg.add(rightShoe); // Attach to right leg container

        return { leftShoe, rightShoe };
    }

    /**
     * Create a player prop (alias for createPerson for backward compatibility)
     */
    createPlayerProp(position, options) {
        return this.createPerson(position, { ...options, name: 'player' });
    }

    /**
     * Get a person by name
     */
    getPerson(name) {
        return this.persons[name];
    }

    /**
     * Get all persons
     */
    getAllPersons() {
        return this.persons;
    }

    /**
     * Remove a person from the scene
     */
    removePerson(name) {
        const person = this.persons[name];
        if (person) {
            this.scene.remove(person);
            delete this.persons[name];
        }
    }

    /**
     * Update bounding box and helper for a person
     * @param {string} name - Name of the person to update
     */
    updatePersonBoundingBox(name) {
        const person = this.persons[name];
        if (person && person.BBox && person.bboxHelper) {
            // Update bounding box
            person.BBox.setFromObject(person);
            
            // Update helper visualization
            person.bboxHelper.box.copy(person.BBox);
        }
    }

    /**
     * Update all person bounding boxes
     */
    updateAllBoundingBoxes() {
        for (const name in this.persons) {
            this.updatePersonBoundingBox(name);
        }
    }

    /**
     * Update walking animation for a person
     * @param {THREE.Group} person - The person group
     * @param {number} deltaTime - Time since last frame
     */
    updateWalkingAnimation(person, deltaTime) {
        if (!person.bodyParts || !person.animationState) {
            console.log('Missing bodyParts or animationState for person:', person.name);
            return;
        }

        const { legs, arms, feet } = person.bodyParts;
        const animState = person.animationState;

        // Calculate movement speed to determine if walking
        const currentPos = person.position.clone();
        const movement = currentPos.distanceTo(animState.lastPosition);
        const isMoving = movement > 0.01; // Stable threshold for movement detection

        // Smooth walking state transition to prevent jittering
        if (isMoving) {
            animState.isWalking = true;
        } else {
            // Add a small delay before stopping walking animation
            if (animState.walkingStopTimer === undefined) {
                animState.walkingStopTimer = 0;
            }
            animState.walkingStopTimer += deltaTime;
            
            if (animState.walkingStopTimer > 0.2) { // 200ms delay
                animState.isWalking = false;
                animState.walkingStopTimer = 0;
            }
        }
        
        if (isMoving) {
            animState.walkingStopTimer = 0; // Reset timer when moving
        }

        animState.lastPosition.copy(currentPos);

        if (animState.isWalking) {
            // Smoother walk cycle speed
            animState.walkCycle += deltaTime * 4; // Slower, smoother walking speed

            // Smooth leg animation with easing
            const legSwing = Math.sin(animState.walkCycle) * 0.3; // Reduced swing for smoothness
            const targetLeftLegRotation = legSwing;
            const targetRightLegRotation = -legSwing;
            
            if (legs && legs.leftLeg) {
                // Smooth interpolation to target rotation
                legs.leftLeg.rotation.x = THREE.MathUtils.lerp(
                    legs.leftLeg.rotation.x, 
                    targetLeftLegRotation, 
                    0.15
                );
            }
            if (legs && legs.rightLeg) {
                legs.rightLeg.rotation.x = THREE.MathUtils.lerp(
                    legs.rightLeg.rotation.x, 
                    targetRightLegRotation, 
                    0.15
                );
            }

            // Feet automatically follow legs since they're attached to leg containers
            // No separate foot animation needed

            // Smooth arm animation
            const armSwing = Math.sin(animState.walkCycle) * 0.15; // Reduced arm swing
            const targetLeftArmRotation = -armSwing;
            const targetRightArmRotation = armSwing;
            
            if (arms && arms.leftArm) {
                arms.leftArm.rotation.x = THREE.MathUtils.lerp(
                    arms.leftArm.rotation.x,
                    targetLeftArmRotation,
                    0.1
                );
            }
            if (arms && arms.rightArm) {
                arms.rightArm.rotation.x = THREE.MathUtils.lerp(
                    arms.rightArm.rotation.x,
                    targetRightArmRotation,
                    0.1
                );
            }
        } else {
            // Smoothly return to neutral position when not walking
            animState.walkCycle = 0;
            
            // Subtle breathing animation when standing
            const breathingCycle = Date.now() * 0.001; // Slow breathing
            const breathingOffset = Math.sin(breathingCycle) * 0.01; // Very subtle
            
            // Smooth transition to neutral positions
            if (legs && legs.leftLeg) {
                legs.leftLeg.rotation.x = THREE.MathUtils.lerp(legs.leftLeg.rotation.x, 0, 0.1);
            }
            if (legs && legs.rightLeg) {
                legs.rightLeg.rotation.x = THREE.MathUtils.lerp(legs.rightLeg.rotation.x, 0, 0.1);
            }
            // Feet automatically return to neutral with legs since they're attached
            if (arms && arms.leftArm) {
                arms.leftArm.rotation.x = THREE.MathUtils.lerp(arms.leftArm.rotation.x, breathingOffset, 0.05);
            }
            if (arms && arms.rightArm) {
                arms.rightArm.rotation.x = THREE.MathUtils.lerp(arms.rightArm.rotation.x, breathingOffset, 0.05);
            }
        }
    }

    /**
     * Update jumping animation for a person
     * @param {THREE.Group} person - The person group
     * @param {number} targetY - Target Y position
     */
    updateJumpingAnimation(person, targetY) {
        if (!person.animationState) return;

        const animState = person.animationState;
        const currentY = person.position.y;
        const groundLevel = 0;

        // Detect if jumping (above ground level)
        animState.isJumping = targetY > groundLevel + 0.1;

        if (animState.isJumping) {
            // Smooth interpolation to target position
            person.position.y = THREE.MathUtils.lerp(currentY, targetY, 0.15);
            
            // Add slight body lean during jump
            if (person.bodyParts.torso) {
                const jumpHeight = Math.max(0, targetY - groundLevel);
                person.bodyParts.torso.rotation.x = jumpHeight * 0.1; // Slight forward lean
            }
        } else {
            // Smooth landing
            person.position.y = THREE.MathUtils.lerp(currentY, groundLevel, 0.2);
            
            // Reset body lean
            if (person.bodyParts.torso) {
                person.bodyParts.torso.rotation.x = THREE.MathUtils.lerp(
                    person.bodyParts.torso.rotation.x, 0, 0.1
                );
            }
        }
    }

    /**
     * Animate persons (walking, jumping, gestures, etc.)
     */
    animatePersons(deltaTime = 0.016) {
        // Update all bounding boxes each frame
        this.updateAllBoundingBoxes();
        
        // Animate all persons
        for (const name in this.persons) {
            const person = this.persons[name];
            this.updateWalkingAnimation(person, deltaTime);
        }
    }
}
