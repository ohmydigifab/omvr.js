/**
 * @author takumadx / http://www.ohmydigifab.com/
 */

var OMVR = function() {
	var myAttitude = {
		Roll : 0,
		Pitch : 0,
		Yaw : 0
	};

	var vehicleAttitude = {
		Roll : 0,
		Pitch : 0,
		Yaw : 0
	};

	var camera, scene, renderer;

	var texture;
	var canvas;
	var context;
	var effect;

	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);
		effect.setSize(window.innerWidth, window.innerHeight);
	}

	var fisheyeCameraList = Array();

	var fisheye_vertexShader = [ "",

	"varying   vec4 vTexCoord;",

	"void main(void){",

	"    vTexCoord = vec4(position,1.0);",

	"    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);",

	"}",

	"" ].join("\n");
	var fisheye_fragmentShader = [ "",

	"varying vec4 vTexCoord;",

	"uniform bool flipX;",

	"uniform bool flipY;",

	"uniform sampler2D texture;",

	"const float PI = 3.1415926535;",

	"void main(void){",

	"    float pitch = atan(vTexCoord.y, vTexCoord.x);",

	"    float n = length(vTexCoord.xy);",

	"    float roll = atan(n, vTexCoord.z);",

	"    float r = 1.33 * roll / PI;",

	"    float u = r * cos(pitch) + 0.5;",

	"    float v = r * sin(pitch) + 0.5;",

	"    if(r > 0.60 || u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0){",

	"		gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0);",

	"    }",

	"    else{",

	"	    if(flipX){",

	"	    	u = 1.0 - u;",

	"	    }",

	"	    if(flipY){",

	"	    	v = 1.0 - v;",

	"	    }",

	"	    gl_FragColor = texture2D(texture, vec2(u, v));",

	"	}",

	"}",

	"" ].join("\n");

	return {
		set_myAttitude : function(value) {
			myAttitude = value;
		},

		set_vehicleAttitude : function(value) {
			vehicleAttitude = value;
		},

		add_fisheyeCamera : function(default_image_url, imageUrl, flipX, flipY, image_updated_callback, attitude) {
			var geometry = new THREE.SphereGeometry(500, 100, 100, 0, Math.PI);
			geometry.scale(1, 1, 1);

			var texLoader = new THREE.TextureLoader();
			var texture = texLoader.load(default_image_url, function(tex) {
				var material = new THREE.ShaderMaterial({
					vertexShader : fisheye_vertexShader,
					fragmentShader : fisheye_fragmentShader,
					uniforms : {
						flipX : {
							type : 'i',
							value : flipX
						},
						flipY : {
							type : 'i',
							value : flipY
						},
						texture : {
							type : 't',
							value : texture
						}
					},
					side : THREE.DoubleSide,
					// 通常マテリアルのパラメータ
					blending : THREE.AdditiveBlending,
					transparent : true,
					depthTest : false
				});
				material.needsUpdate = true;
				var mesh = new THREE.Mesh(geometry, material);
				scene.add(mesh);

				fisheyeCameraList.push({
					loading : false,
					default_image_url : default_image_url,
					imageUrl : imageUrl,
					image_updated_callback : image_updated_callback,
					mesh : mesh,
					attitude : attitude
				});
			});
		},

		init : function(container) {

			camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1100);
			camera.position = new THREE.Vector3(0, 0, 0);
			camera.target = new THREE.Vector3(0, 0, -1);
			camera.up = new THREE.Vector3(0, 1, 0);
			camera.lookAt(camera.target);

			scene = new THREE.Scene();

			renderer = new THREE.WebGLRenderer({
				antialias : true
			});
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(window.innerWidth, window.innerHeight);
			container.appendChild(renderer.domElement);

			effect = new THREE.StereoEffect(renderer);
			effect.setSize(window.innerWidth, window.innerHeight);

			window.addEventListener('resize', onWindowResize, false);
		},

		animate : function() {
			fisheyeCameraList.forEach(function(fisheyeCamera) {
				if (fisheyeCamera.loading == false) {
					fisheyeCamera.loading = true;
					var texLoader = new THREE.TextureLoader();
					var texture = texLoader.load(fisheyeCamera.imageUrl, function(tex) {
						console.log('Drawing image');
						var old = fisheyeCamera.mesh.material.uniforms.texture.value;
						fisheyeCamera.mesh.material.uniforms.texture.value = tex;
						fisheyeCamera.mesh.material.needsUpdate = true;
						old.dispose();
						fisheyeCamera.loading = false;
					});
					setTimeout(function() {
						if (texture.image == null || !texture.image.complete || !texture.image.naturalWidth) {
							console.log('timeout');
							fisheyeCamera.loading = false;
						}
					}, 5000);
					if (fisheyeCamera.image_updated_callback) {
						fisheyeCamera.image_updated_callback();
					}
				}
			});

			this.update();
		},

		update : function() {
			fisheyeCameraList.forEach(function(fisheyeCamera) {
				var euler_correct = new THREE.Euler(THREE.Math.degToRad(fisheyeCamera.attitude.Roll), THREE.Math.degToRad(fisheyeCamera.attitude.Pitch), THREE.Math
						.degToRad(fisheyeCamera.attitude.Yaw));
				euler_correct.order = "ZYX";

				var quat_correct = new THREE.Quaternion();
				quat_correct.setFromEuler(euler_correct);

				var vehicleAttitude_euler = new THREE.Euler(THREE.Math.degToRad(vehicleAttitude.Roll), THREE.Math.degToRad(-vehicleAttitude.Pitch), THREE.Math.degToRad(-vehicleAttitude.Yaw + 180));
				vehicleAttitude_euler.order = "ZYX";

				var target = new THREE.Vector3(0, 0, 1);
				fisheyeCamera.mesh.up = new THREE.Vector3(0, 1, 0);

				var quat1 = new THREE.Quaternion();
				quat1.setFromEuler(vehicleAttitude_euler);
				quat1.multiply(quat_correct);

				target.applyQuaternion(quat1);
				fisheyeCamera.mesh.up.applyQuaternion(quat1);

				fisheyeCamera.mesh.lookAt(target);
			});
			{// myAttitude
				var myAttitude_euler = new THREE.Euler(THREE.Math.degToRad(myAttitude.Roll), THREE.Math.degToRad(-myAttitude.Pitch), THREE.Math.degToRad(myAttitude.Yaw));
				myAttitude_euler.order = "ZYX";

				var quat2 = new THREE.Quaternion();
				quat2.setFromEuler(myAttitude_euler);

				camera.target = new THREE.Vector3(0, 0, -1);
				camera.up = new THREE.Vector3(0, 1, 0);

				camera.target.applyQuaternion(quat2);
				camera.up.applyQuaternion(quat2);

				camera.lookAt(camera.target);
			}

			if (this.stero_enabled) {
				effect.render(scene, camera);

			} else {
				renderer.render(scene, camera);
			}
		},

		stero_enabled : false
	}
}