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

        // Create body parts
        this.createHead(personGroup, skinMaterial, config.scale);
        this.createHair(personGroup, hairMaterial, config.scale);
        this.createTorso(personGroup, clothingMaterial, config.scale);
        this.createArms(personGroup, clothingMaterial, skinMaterial, config.scale);
        this.createLegs(personGroup, pantsMaterial, config.scale);
        this.createFeet(personGroup, shoeMaterial, config.scale);

        // Position the entire person
        personGroup.position.copy(position);
        
        // Add bounding box for collision detection
        personGroup.BBox = new THREE.Box3().setFromObject(personGroup);
        
        // Add bounding box helper (can be removed later)
        const bboxHelper = new THREE.Box3Helper(personGroup.BBox, 0x00ff00);
        this.scene.add(bboxHelper);

        // Store the person
        this.persons[config.name] = personGroup;
        this.scene.add(personGroup);
        
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
        const legGeometry = new THREE.CylinderGeometry(0.06 * scale, 0.07 * scale, 0.7 * scale, 8);
        
        // Left leg
        const leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        leftLeg.position.set(-0.08 * scale, 0.55 * scale, 0);
        leftLeg.castShadow = true;
        leftLeg.receiveShadow = true;
        personGroup.add(leftLeg);

        // Right leg
        const rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
        rightLeg.position.set(0.08 * scale, 0.55 * scale, 0);
        rightLeg.castShadow = true;
        rightLeg.receiveShadow = true;
        personGroup.add(rightLeg);

        return { leftLeg, rightLeg };
    }

    /**
     * Create the feet/shoes of the person
     */
    createFeet(personGroup, shoeMaterial, scale) {
        const shoeGeometry = new THREE.BoxGeometry(0.12 * scale, 0.06 * scale, 0.2 * scale);
        
        // Left shoe
        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(-0.08 * scale, 0.15 * scale, 0.05 * scale);
        leftShoe.castShadow = true;
        leftShoe.receiveShadow = true;
        personGroup.add(leftShoe);

        // Right shoe
        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(0.08 * scale, 0.15 * scale, 0.05 * scale);
        rightShoe.castShadow = true;
        rightShoe.receiveShadow = true;
        personGroup.add(rightShoe);

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
     * Animate persons (for future use - walking, gestures, etc.)
     */
    animatePersons() {
        // Future implementation for person animations
        // Could include walking cycles, arm movements, etc.
    }
}
